import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectPrismReferences, getPrismReferenceContext, PRISM_REFERENCE_ENTRIES } from '../lib/prism-reference.js';

for (const query of ['', null, 'How should I interview a director?', 'How do I handle flood risk?', 'The eye of the storm', 'The evolution of our pricing strategy', 'What is grace?']) {
  assert.equal(getPrismReferenceContext(query), '', `Unrelated inquiry: ${query}`);
}
for (const [query, id] of [
  ['Does common ancestry prove there is no God?', 'common-ancestry'],
  ['Evidence for a global flood?', 'ancient-floods'],
  ['Is the flagellum irreducibly complex?', 'irreducible-complexity'],
  ['James Tour on abiogenesis', 'origin-of-life'],
  ['Did Darwin say the eye refutes evolution?', 'eye-evolution'],
  ['Successful creationist predictions about junk DNA?', 'prediction-and-dna'],
  ['PSR and IDK of the gaps', 'psr-and-uncertainty'],
]) {
  assert.ok(selectPrismReferences(query).some(entry => entry.id === id), query);
}
const psr = getPrismReferenceContext('PSR and IDK of the gaps');
assert.match(psr, /not criticizing honest suspension/);
assert.doesNotMatch(psr, /Flagellar|lipid compartments/);
assert.match(getPrismReferenceContext('creationists are wrong about everything'), /equal scrutiny without forcing equal evidential support/);
const all = PRISM_REFERENCE_ENTRIES.flatMap(entry => entry.triggers.map(() => entry.topic)).join(' ') + ' common ancestry global flood irreducible complexity abiogenesis eye evolution junk DNA PSR';
assert.equal(selectPrismReferences(all).length, 4);
assert.ok(getPrismReferenceContext(all).length < 12000);
for (const entry of PRISM_REFERENCE_ENTRIES) {
  assert.ok(entry.evidence && entry.limits && entry.reviewed);
  for (const source of entry.sources) assert.equal(new URL(source.url).protocol, 'https:');
}
// All existing response paths use this shared wrapper; database failure must
// not suppress local references, and unrelated requests receive no extra text.
const api = readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const wrapper = api.match(/async function getCuratedLearningContext\(userQuery, timing\) \{[\s\S]*?\n\}/)[0];
const runWrapper = new Function('getPrismReferenceContext', 'getApprovedLearningContext', 'console', `${wrapper}; return getCuratedLearningContext;`);
const quietConsole = { error() {} };
assert.equal(await runWrapper(getPrismReferenceContext, async () => { throw Error('offline'); }, quietConsole)('PSR'), getPrismReferenceContext('PSR'));
assert.equal(await runWrapper(getPrismReferenceContext, async () => 'existing learning', quietConsole)('PSR'), getPrismReferenceContext('PSR') + 'existing learning');
assert.equal(await runWrapper(getPrismReferenceContext, async () => '', quietConsole)('What is grace?'), '');
assert.ok((api.match(/getCuratedLearningContext\(/g) || []).length >= 4, 'Initial and follow-up response paths remain wired');
console.log('Prism reference routing and integration checks passed.');
