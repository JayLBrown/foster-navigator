import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { verify, tierOf } from './web/app/lib/gate.ts';

const MODEL = process.env.MODEL ?? 'claude-sonnet-4-5';
const SABOTAGE = process.argv.includes('--sabotage');

const corpus = JSON.parse(fs.readFileSync('./web/app/corpus/rules.json', 'utf8'));
const questions = JSON.parse(fs.readFileSync('./eval/questions.json', 'utf8'));
const RULES = corpus.rules;

/* ---------- the answer contract ---------- */

const Answer = z.object({
  verdict: z.enum(['yes', 'no', 'conditional', 'insufficient']),
  headline: z.string().max(40),
  statement: z.string(),
  citations: z.array(z.object({
    rule_number: z.string(),
    verbatim_quote: z.string(),
  })),
});

const TOOL = {
  name: 'answer',
  description: 'Return a verdict on the foster parent licensing question.',
  input_schema: {
    type: 'object',
    properties: {
      verdict: { type: 'string', enum: ['yes', 'no', 'conditional', 'insufficient'] },
      headline: { type: 'string', description: 'One or two words. e.g. "No." "Yes." "It depends."' },
      statement: { type: 'string', description: 'One plain-language sentence a foster parent can act on.' },
      citations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rule_number: { type: 'string' },
            verbatim_quote: { type: 'string', description: 'Copied EXACTLY from the rule text. Not paraphrased.' },
          },
          required: ['rule_number', 'verbatim_quote'],
        },
      },
    },
    required: ['verdict', 'headline', 'statement', 'citations'],
  },
};

const SYSTEM = `You answer Michigan foster parent licensing questions using ONLY the rules below.

${RULES.map(r => `${r.rule_number} - ${r.heading}\n${r.body}`).join('\n\n')}

Rules of engagement:
- Every quote in "verbatim_quote" must be copied character-for-character from the text above. Never paraphrase, never reconstruct from memory.
- If the rules above do not clearly answer the question, return verdict "insufficient" with an empty citations array. This is a correct and expected outcome, not a failure.
- Do not infer prohibitions that are not written. A rule that prohibits something in bedrooms does not prohibit it elsewhere.
- Use "conditional" when the rules answer partially or the answer depends on facts not given.`;

/* ---------- run ---------- */

const client = new Anthropic();

async function ask(question) {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'answer' },
    messages: [{ role: 'user', content: question }],
  });

  const block = res.content.find(b => b.type === 'tool_use');
  const parsed = Answer.safeParse(block?.input);
  if (!parsed.success) return { schemaError: parsed.error.issues.map(i => i.message).join('; ') };

  const answer = parsed.data;
  if (SABOTAGE && answer.citations.length) {
    answer.citations[0].verbatim_quote += ' and in hallways';
  }

  const failures = verify(answer, RULES);
  return { answer, failures, tier: tierOf(answer, failures) };
}

const pad = s => String(s).padEnd(13);
let escalated = 0, rendered = 0, gateStops = 0;

console.log(`\nmodel: ${MODEL}   corpus: ${RULES.length} sections${SABOTAGE ? '   [SABOTAGE ON]' : ''}\n`);

for (const { q, expect } of questions) {
  const { answer, failures, tier, schemaError } = await ask(q);
  console.log('─'.repeat(72));
  console.log(`Q  ${q}`);
  console.log(`   expected: ${expect}`);

  if (schemaError) { console.log(`   SCHEMA FAIL: ${schemaError}\n`); continue; }

  if (failures.length) {
    gateStops++; escalated++;
    console.log(`   ${pad('GATE STOPPED')}${failures.join(' | ')}`);
    console.log(`   ${pad('shown to user')}Specialist review needed`);
  } else if (answer.verdict === 'insufficient') {
    escalated++;
    console.log(`   ${pad('verdict')}insufficient -> escalate`);
  } else {
    rendered++;
    console.log(`   ${pad('verdict')}${answer.verdict}  (${tier})`);
    console.log(`   ${pad('headline')}${answer.headline}`);
    console.log(`   ${pad('statement')}${answer.statement}`);
    for (const c of answer.citations) console.log(`   ${pad('cited')}${c.rule_number}  "${c.verbatim_quote}"`);
  }
  console.log();
}

console.log('═'.repeat(72));
console.log(`answered: ${rendered}   escalated: ${escalated}   stopped by gate: ${gateStops}\n`);
