import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { RULES } from "./corpus";
import { verify, tierOf, type Answer, type MatchTier } from "./gate";

const AnswerSchema = z.object({
  verdict: z.enum(["yes", "yes_if", "no", "no_unless", "insufficient"]),
  headline: z.string(),
  statement: z.string(),
  citations: z.array(
    z.object({ rule_number: z.string(), verbatim_quote: z.string() })
  ),
  conditions: z
    .array(
      z.object({
        text: z.string(),
        rule_number: z.string(),
        verbatim_quote: z.string(),
      })
    )
    .default([]),
});

const TOOL = {
  name: "answer",
  description: "Return a verdict on the foster parent licensing question.",
  input_schema: {
    type: "object" as const,
    properties: {
      verdict: {
        type: "string",
        enum: ["yes", "yes_if", "no", "no_unless", "insufficient"],
        description:
          "yes = permitted outright. yes_if = permitted, conditions apply. no = prohibited outright. no_unless = prohibited with narrow exceptions. insufficient = the rules do not settle it.",
      },
      headline: {
        type: "string",
        description: 'Short: "Yes." "Yes, with conditions." "No." "No, with narrow exceptions."',
      },
      statement: { type: "string", description: "One plain-language sentence a foster parent can act on." },
      conditions: {
        type: "array",
        description:
          "Required when verdict is yes_if or no_unless. Each item is one thing the foster parent must do or check, in plain language, with the rule it comes from.",
        items: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Plain language, addressed to the foster parent. e.g. 'Tell your agency if the stay is longer than 3 days.'",
            },
            rule_number: { type: "string" },
            verbatim_quote: {
              type: "string",
              description: "Copied EXACTLY from the rule text that imposes this condition.",
            },
          },
          required: ["text", "rule_number", "verbatim_quote"],
        },
      },
      citations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            rule_number: { type: "string" },
            verbatim_quote: { type: "string", description: "Copied EXACTLY from the rule text. Never paraphrased." },
          },
          required: ["rule_number", "verbatim_quote"],
        },
      },
    },
    required: ["verdict", "headline", "statement", "citations"],
  },
};

const SYSTEM = `You answer Michigan foster parent licensing questions using ONLY the rules below.

${RULES.map((r) => `${r.rule_number} - ${r.heading}\n${r.body}`).join("\n\n")}

Rules of engagement:

- Every "verbatim_quote" must be copied character-for-character from the text above. Never paraphrase, never reconstruct from memory.

- Do not infer prohibitions that are not written. A rule prohibiting something in bedrooms does not prohibit it elsewhere. Silence in the rules is not a prohibition.

- COMMIT TO A DIRECTION. Most questions are not a coin flip. If the rules permit something subject to requirements, that is "yes_if", not a shrug. If they prohibit something with narrow exceptions, that is "no_unless". Reserve "insufficient" for questions the rules genuinely do not reach.

- For "yes_if" and "no_unless" you MUST list the conditions. Each one is a single concrete thing the foster parent does or checks, written plainly and addressed to them, with the rule text that imposes it. A conditional verdict with no conditions is useless to a parent.

- Worked example. "Can my foster child stay overnight at a friend's house?" The rules do not forbid it; they attach requirements. So: verdict "yes_if", and conditions covering the background-checked adult, supervision appropriate to the child, and notifying the agency past three days — each quoting the rule that says so.

- If the rules above do not reach the question at all, return "insufficient" with empty citations and conditions. That is a correct outcome, not a failure — it routes the parent to a human.`;

export type Verified = {
  answer: Answer;
  failures: string[];
  tier: MatchTier;
  escalate: boolean;
};

export async function answerQuestion(
  question: string,
  env: { ANTHROPIC_API_KEY: string; MODEL?: string }
): Promise<Verified | { error: string }> {
  if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY.includes("...")) {
    return { error: "The rule checker is not configured yet (missing API key)." };
  }
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  let res;
  try {
    res = await client.messages.create({
      model: env.MODEL ?? "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "answer" },
      messages: [{ role: "user", content: question }],
    });
  } catch (err) {
    /* Never let an upstream failure reach the foster parent as a stack trace.
       Log it, and let the caller route this to specialist review. */
    console.error("anthropic call failed:", err);
    return { error: "We could not check the rules just now." };
  }

  const block = res.content.find((b) => b.type === "tool_use");
  const parsed = AnswerSchema.safeParse(block && "input" in block ? block.input : null);
  if (!parsed.success) return { error: "The model returned an unexpected shape." };

  const answer = parsed.data as Answer;
  const failures = verify(answer, RULES);
  const tier = tierOf(answer, failures);

  // A failed gate is never shown. It becomes an escalation.
  const escalate = failures.length > 0 || answer.verdict === "insufficient";

  return { answer, failures, tier, escalate };
}
