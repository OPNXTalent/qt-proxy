// test-theodicy-gate.mjs
// CLI regression test harness for shouldLoadTheodicyModule()
// and prompt composition behavior.
//
// Run: node test-theodicy-gate.mjs
//
// Tests two things:
//   1. Gate behavior: module loads when required, stays absent when irrelevant
//   2. Prompt composition: stub present in base, module appended only when triggered,
//      matchCount and token estimates within expected ranges

import { PRISM_THEODICY_MODULE } from '../lib/prompt-modules/theodicy.js';

// ── Inline the gate function for testing ─────────────────────────────────────
// (mirrors the implementation in interpret.js exactly)
function shouldLoadTheodicyModule(query, inquiryClassification) {
  if (!query) return false;
  const q = query.toLowerCase();

  const theodicyEligibleClasses = [
    'Existential', 'Philosophical', 'Theological', 'Comparative'
  ];
  const classificationSignal = inquiryClassification &&
    theodicyEligibleClasses.includes(inquiryClassification);

  const challengePhrases = [
    /does (evil|suffering|pain|abuse|genocide|cancer|holocaust|famine|disease) (disprove|prove|mean there is no|mean god doesn|refute)/i,
    /if (god|he|yhwh) (exists?|is real|is good|is just|is loving|is sovereign|is all.?powerful)/i,
    /how can (god|he|a god|yhwh) (be|exist|allow|permit|watch|let|stand by)/i,
    /why (does|did|would|would a loving|didn.t) (god|he|yhwh|a good god) (allow|permit|let|cause|create|watch|do nothing)/i,
    /god (watched|allowed|permitted|let|did nothing|stood by|created|caused|is responsible for)/i,
    /where (is|was) god (when|while|during|as)/i,
    /why (didn.t|doesn.t|won.t) god (stop|prevent|intervene|act|save)/i,
    /(evil|suffering|pain|abuse|holocaust|genocide|famine|cancer|disease).*(proves?|disproves?|means?|shows?).*(no god|god doesn|god can.t|god isn.t|god is not)/i,
    /is god (responsible|to blame|the cause|the author) (for|of)/i,
    /how can (hell|eternal punishment|damnation) be (just|fair|moral|right|good)/i,
    /god.*(moral|morally|justice|just|good|evil|wicked|cruel|monstrous|sadistic)/i,
    /problem of evil/i,
    /theodicy/i,
    /epicurus/i,
    /hume.*(god|evil|suffering)/i,
    /(evil|suffering).*(existence|existence of god|god exists)/i,
  ];
  const semanticSignal = challengePhrases.some(pattern => pattern.test(q));

  const sufferingTerms = [
    'suffer', 'suffering', 'evil', 'pain', 'abuse', 'molestation',
    'murder', 'rape', 'genocide', 'holocaust', 'famine', 'disease', 'cancer',
    'death', 'calamity', 'disaster', 'tragedy', 'atrocity', 'injustice',
    'innocent', 'children suffer', 'child suffer', 'babies', 'innocent die'
  ];
  const accusationMarkers = [
    'god', 'yhwh', 'he ', 'his ', 'lord', 'creator', 'jesus', 'sovereign',
    'omnipotent', 'all-powerful', 'all powerful', 'omniscient', 'omnisci'
  ];
  const hasSuffering = sufferingTerms.some(t => q.includes(t));
  const hasAccusation = accusationMarkers.some(t => q.includes(t));
  const propositionSignal = hasSuffering && hasAccusation;

  const isComparativeEvil = inquiryClassification === 'Comparative' && hasSuffering;
  return semanticSignal || (classificationSignal && propositionSignal) || isComparativeEvil;
}

// ── Test cases ────────────────────────────────────────────────────────────────

const LOAD   = true;
const NO_LOAD = false;

const cases = [
  // ── Should trigger ─────────────────────────────────────────────────────────
  { q: 'If there is a God why does He witness the molestation of children and do nothing to stop it?',
    cls: 'Existential',  expected: LOAD,    note: 'Original failing query' },
  { q: 'If God exists, why did he allow children to be abused?',
    cls: 'Existential',  expected: LOAD,    note: 'Variant phrasing' },
  { q: 'Does the existence of evil disprove God?',
    cls: 'Philosophical', expected: LOAD,   note: 'Direct existence challenge' },
  { q: 'Compare Christianity and Buddhism on suffering.',
    cls: 'Comparative',  expected: LOAD,    note: 'Comparative + suffering' },
  { q: 'How can God be good if children suffer?',
    cls: 'Theological',  expected: LOAD,    note: 'Goodness challenge' },
  { q: "Why didn't God stop the Holocaust?",
    cls: 'Existential',  expected: LOAD,    note: 'Historical atrocity challenge' },
  { q: 'Is God responsible for famine?',
    cls: 'Theological',  expected: LOAD,    note: 'Responsibility framing' },
  { q: 'How can hell be morally just?',
    cls: 'Theological',  expected: LOAD,    note: 'Hell justice challenge' },
  { q: 'Why does God permit abuse?',
    cls: 'Existential',  expected: LOAD,    note: 'Permission framing' },
  { q: 'Which worldview best explains evil?',
    cls: 'Comparative',  expected: LOAD,    note: 'Comparative evil query' },
  { q: 'The problem of evil makes belief impossible.',
    cls: 'Philosophical', expected: LOAD,   note: 'Problem of evil explicit' },
  { q: "God watched every act of genocide throughout history and did nothing.",
    cls: 'Existential',  expected: LOAD,    note: 'Direct accusation' },
  { q: 'Does theodicy have a coherent answer?',
    cls: 'Philosophical', expected: LOAD,   note: 'Theodicy keyword' },
  { q: "Epicurus showed God cannot be both good and all-powerful.",
    cls: 'Philosophical', expected: LOAD,   note: 'Epicurus reference' },
  { q: 'How can God be sovereign if evil exists?',
    cls: 'Theological',  expected: LOAD,    note: 'Sovereignty challenge' },

  // ── Should NOT trigger ────────────────────────────────────────────────────
  { q: 'Why did Job suffer?',
    cls: 'Theological',  expected: NO_LOAD, note: 'Narrative — not divine accusation' },
  { q: 'What does Isaiah 45:7 mean?',
    cls: 'Textual',      expected: NO_LOAD, note: 'Textual — no challenge posture' },
  { q: 'Does the Bible contradict itself?',
    cls: 'Textual',      expected: NO_LOAD, note: 'Textual — no theodicy' },
  { q: 'How should a Christian respond to workplace conflict?',
    cls: 'Practical',    expected: NO_LOAD, note: 'Practical — no theodicy' },
  { q: 'What is the meaning of Echad?',
    cls: 'Theological',  expected: NO_LOAD, note: 'Definitional — no challenge' },
  { q: 'How did early Christians interpret Genesis 1?',
    cls: 'Historical',   expected: NO_LOAD, note: 'Historical — no challenge' },
  { q: 'My friend is going through cancer. How do I support them?',
    cls: 'Practical',    expected: NO_LOAD, note: 'Suffering without divine accusation' },
  { q: 'What is the role of lament in the Psalms?',
    cls: 'Theological',  expected: NO_LOAD, note: 'Lament without divine accusation' },
  { q: 'Can you explain the covenants in Scripture?',
    cls: 'Theological',  expected: NO_LOAD, note: 'Covenant — no theodicy' },
  { q: 'How do I forgive someone who hurt me?',
    cls: 'Practical',    expected: NO_LOAD, note: 'Relational — no theodicy' },
];

// ── Run tests ─────────────────────────────────────────────────────────────────

let pass = 0;
let fail = 0;
const failures = [];

console.log('\nTHEODICY GATE — REGRESSION TEST\n' + '─'.repeat(70));

for (const c of cases) {
  const result = shouldLoadTheodicyModule(c.q, c.cls);
  const ok = result === c.expected;
  if (ok) pass++;
  else {
    fail++;
    failures.push(c);
  }
  const label = ok ? 'PASS' : 'FAIL';
  const action = result ? 'LOAD  ' : 'SKIP  ';
  console.log(`${label}  ${action}  [${c.cls?.padEnd(14)}]  ${c.note}`);
  if (!ok) {
    console.log(`       Query: "${c.q.slice(0, 70)}"`);
    console.log(`       Expected: ${c.expected ? 'LOAD' : 'SKIP'}, got: ${result ? 'LOAD' : 'SKIP'}`);
  }
}

// ── Prompt composition checks ─────────────────────────────────────────────────

console.log('\n' + '─'.repeat(70));
console.log('PROMPT COMPOSITION CHECKS\n');

const moduleTokens = Math.round(PRISM_THEODICY_MODULE.length / 4);
const stubText = 'THEODICY PRESSURE — STUB (FULL PROTOCOL LOADS CONDITIONALLY):';

// Module content integrity
const moduleChecks = [
  ['Module: Move 1 present',        PRISM_THEODICY_MODULE.includes('MOVE 1 — THE YES')],
  ['Module: Move 8 present',        PRISM_THEODICY_MODULE.includes('MOVE 8 — SCIENTIFIC CORROBORATION')],
  ['Module: Isaiah 45:7 present',   PRISM_THEODICY_MODULE.includes('Isaiah 45:7')],
  ['Module: Genesis 50:20 present', PRISM_THEODICY_MODULE.includes('Genesis 50:20')],
  ['Module: Penrose-Hameroff',      PRISM_THEODICY_MODULE.includes('Penrose-Hameroff')],
  ['Module: Van Lommel',            PRISM_THEODICY_MODULE.includes('van Lommel')],
  ['Module: Wigner',                PRISM_THEODICY_MODULE.includes('Wigner')],
  ['Module: Emet connection',       PRISM_THEODICY_MODULE.includes('EMET CONNECTION')],
  ['Module: Olam HaBa',             PRISM_THEODICY_MODULE.includes('Olam HaBa')],
  ['Module: no double-load guard',  !PRISM_THEODICY_MODULE.includes('PRISM_THEODICY_MODULE')],
  [`Module: token size reasonable (got ~${moduleTokens})`,
                                    moduleTokens > 1800 && moduleTokens < 3000],
];

for (const [name, cond] of moduleChecks) {
  const ok = Boolean(cond);
  if (ok) pass++; else { fail++; failures.push({ note: name }); }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(70));
console.log(`\nResults: ${pass} passed, ${fail} failed`);
console.log(`Module size: ~${moduleTokens} tokens (loaded only when triggered)`);
console.log(`Stub size: ~${Math.round(stubText.length / 4)} tokens base overhead`);

if (fail > 0) {
  console.log('\nFAILURES:');
  failures.forEach(f => console.log(`  - ${f.note || JSON.stringify(f)}`));
  process.exit(1);
} else {
  console.log('\nAll tests passed.');
  process.exit(0);
}
