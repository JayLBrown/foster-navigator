/* Tests the SAME gate the app uses: web/app/lib/gate.ts
   Node strips the TypeScript types natively. No duplicate implementation. */
import fs from 'node:fs';
import { verify, tierOf, resolveRule } from './web/app/lib/gate.ts';

const RULES = JSON.parse(fs.readFileSync('./web/app/corpus/rules.json', 'utf8')).rules;
let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${got}, want ${want})`}`);
};

const good = {
  verdict: 'no', headline: 'No.', statement: 'x',
  citations: [{ rule_number: 'R 400.9303(2)', verbatim_quote: 'Portable heating devices may not be used in bedrooms.' }],
  conditions: [],
};
check('exact quote passes', verify(good, RULES).length, 0);
check('exact quote is tier "exact"', tierOf(good, []), 'exact');

const ws = structuredClone(good);
ws.citations[0].verbatim_quote = '  Portable heating   devices may not be used in bedrooms.  ';
check('whitespace differences tolerated', verify(ws, RULES).length, 0);

const partial = structuredClone(good);
partial.citations[0].verbatim_quote = 'may not be used in bedrooms';
check('substring of the rule passes', verify(partial, RULES).length, 0);

const emb = structuredClone(good);
emb.citations[0].verbatim_quote = 'Portable heating devices may not be used in bedrooms or hallways.';
check('added words are caught', verify(emb, RULES).length, 1);

const par = structuredClone(good);
par.citations[0].verbatim_quote = 'Space heaters are prohibited in bedrooms.';
check('paraphrase is caught', verify(par, RULES).length, 1);

const old = structuredClone(good);
old.citations[0].verbatim_quote = 'Portable heating devices may be used for up and awake activity, except in bedrooms.';
check('superseded 2020 text is caught', verify(old, RULES).length, 1);

const ghost = structuredClone(good);
ghost.citations[0].rule_number = 'R 400.9999(1)';
check('invented rule number is caught', verify(ghost, RULES).length, 1);

check('verdict with no citation is caught',
  verify({ verdict: 'no', headline: 'No.', statement: 'x', citations: [], conditions: [] }, RULES).length, 1);
check('insufficient with no citation is allowed',
  verify({ verdict: 'insufficient', headline: '', statement: 'x', citations: [], conditions: [] }, RULES).length, 0);
check('failed gate downgrades tier to "none"', tierOf(emb, verify(emb, RULES)), 'none');

/* Citation granularity. The corpus is keyed by subsection, but a correct
   citation may name the parent rule or a nested item. Rejecting those turned
   good answers into escalations. */
const cite = (rule_number, verbatim_quote) => ({
  verdict: 'no', headline: 'No.', statement: 'x',
  citations: [{ rule_number, verbatim_quote }], conditions: [],
});

const SPANK = 'A foster parent may not physically discipline or use corporal punishment for any reason with a foster child';
check('parent rule number resolves to its subsections',
  verify(cite('R 400.9404', SPANK), RULES).length, 0);
check('subsection number still resolves',
  verify(cite('R 400.9404(3)', SPANK), RULES).length, 0);

const NESTED = 'The bedroom must be free from of all the following';
check('nested item number resolves to its subsection',
  verify(cite('R 400.9306(1)(g)', NESTED), RULES).length, 0);
check('deeply nested number resolves',
  verify(cite('R 400.9306(1)(g)(iii)', NESTED), RULES).length, 0);

check('resolveRule finds the whole family for a bare rule',
  resolveRule('R 400.9303', RULES).length > 1, true);
check('resolveRule returns nothing for an invented rule',
  resolveRule('R 400.9999', RULES).length, 0);

/* The loosened matching must not weaken the gate. */
check('wrong rule number with a real quote is still caught',
  verify(cite('R 400.9310', SPANK), RULES).length, 1);
check('invented rule number is still caught',
  verify(cite('R 400.9999(1)', SPANK), RULES).length, 1);
check('paraphrase under a valid parent number is still caught',
  verify(cite('R 400.9404', 'Spanking is banned in all cases.'), RULES).length, 1);
check('curly and straight apostrophes are equivalent',
  verify(cite('R 400.9404(3)', "based on each foster child\u2019s needs"), RULES).length, 0);
check('straight apostrophe against curly corpus text',
  verify(cite('R 400.9404(3)', "based on each foster child's needs"), RULES).length, 0);

/* The verdict split — Erica's feedback. A conditional answer must commit to a
   direction AND carry its conditions, each one verified like any other quote. */
const SUPERVISE = 'A foster parent shall identify at least 1 adult who would care for the foster child for an extended overnight period.';
const NOTIFY = 'A foster parent must notify the agency of any extended, overnight period when a foster child will be out of the home for a period exceeding 3 days.';

const sleepover = {
  verdict: 'yes_if',
  headline: 'Yes, with conditions.',
  statement: 'Your foster child can stay overnight, with some requirements.',
  citations: [{ rule_number: 'R 400.9413(2)', verbatim_quote: SUPERVISE }],
  conditions: [
    { text: 'The adult caring for her needs background checks.', rule_number: 'R 400.9413(2)', verbatim_quote: SUPERVISE },
    { text: 'Tell your agency if the stay is longer than 3 days.', rule_number: 'R 400.9413(3)', verbatim_quote: NOTIFY },
  ],
};
check('yes_if with verified conditions passes', verify(sleepover, RULES).length, 0);
check('yes_if is tier "conditions"', tierOf(sleepover, []), 'conditions');

const noConditions = { ...sleepover, conditions: [] };
check('yes_if with NO conditions is caught', verify(noConditions, RULES).length, 1);

const unlessNone = { ...sleepover, verdict: 'no_unless', conditions: [] };
check('no_unless with NO conditions is caught', verify(unlessNone, RULES).length, 1);

const inventedCondition = {
  ...sleepover,
  conditions: [{ text: 'You must get written permission from the court.', rule_number: 'R 400.9413(2)', verbatim_quote: 'Written permission from the court is required for any overnight stay.' }],
};
check('an INVENTED condition is caught', verify(inventedCondition, RULES).length, 1);

const conditionWrongRule = {
  ...sleepover,
  conditions: [{ text: 'x', rule_number: 'R 400.9303(2)', verbatim_quote: NOTIFY }],
};
check('a condition quoting the wrong rule is caught', verify(conditionWrongRule, RULES).length, 1);

const plainYes = {
  verdict: 'yes', headline: 'Yes.', statement: 'x',
  citations: [{ rule_number: 'R 400.9303(1)', verbatim_quote: 'Water heater.' }],
  conditions: [],
};
check('plain yes needs no conditions', verify(plainYes, RULES).length, 0);
check('plain yes with one citation is tier "exact"', tierOf(plainYes, []), 'exact');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
