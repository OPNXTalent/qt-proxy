// Regression contract for the production divine-hiddenness gate and module.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldLoadDivineHiddenness } from '../api/interpret.js';
import { PRISM_DIVINE_HIDDENNESS } from '../lib/prompt-modules/divine-hiddenness.js';

const cases = [
  ['Why is God so hidden from me?', true],
  ['Divine hiddenness is my biggest source of doubt.', true],
  ["Why doesn't God make himself more obvious?", true],
  ["I can't feel or hear God.", true],
  ["I've never had a religious experience or spiritual encounter.", true],
  ['I want a vivid dream or undeniable sign from God so I can believe.', true],
  ['Would demonic possession prove Christianity is real?', true],
  ['Could an exorcism or levitation be evidence for God?', true],
  ['Can signs and wonders be counterfeit or demonic deception?', true],
  ['Why does God allow suffering?', false],
  ['What does Romans 1:20 mean?', false],
  ['What signs did Jesus perform in John?', false],
  ['Why does God speak through prophets?', false],
  ['Interpret my dream about a river.', false],
  ['Explain the mathematics of general relativity.', false],
  ['How should Christians practice discernment?', false],
];

for (const [query, expected] of cases) {
  assert.equal(
    shouldLoadDivineHiddenness(query),
    expected,
    `Unexpected hiddenness gate result for: ${query}`,
  );
}

const requiredContent = [
  'SIGNAL SATURATION',
  'Romans 1:19–20',
  'Certainty that God exists would settle an ontological question',
  'SIGNS DO NOT INTERPRET THEMSELVES',
  'Deuteronomy 13',
  '1 John 4:1',
  'do not pursue it',
  'divine initiative, not a technique',
  'do not know why a desired personal mode of disclosure is withheld',
];

for (const content of requiredContent) {
  assert.ok(PRISM_DIVINE_HIDDENNESS.includes(content), `Missing module contract: ${content}`);
}

const moduleTokens = Math.round(PRISM_DIVINE_HIDDENNESS.length / 4);
assert.ok(moduleTokens >= 700 && moduleTokens <= 1400, `Unexpected module size: ~${moduleTokens} tokens`);

const apiSource = readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
assert.match(apiSource, /import \{ PRISM_DIVINE_HIDDENNESS \} from '\.\.\/lib\/prompt-modules\/divine-hiddenness\.js';/);
assert.equal(
  (apiSource.match(/divineHiddennessModule \? PRISM_DIVINE_HIDDENNESS : ''/g) || []).length,
  2,
  'Divine hiddenness module must be wired into both subscriber and free prompt paths',
);

console.log(`Divine hiddenness gate and module checks passed (~${moduleTokens} tokens).`);
