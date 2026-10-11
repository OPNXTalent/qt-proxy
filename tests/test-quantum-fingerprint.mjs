import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRISM_OPEN_INQUIRY } from '../lib/prompt-modules/open-inquiry.js';
import { PRISM_QUANTUM_FINGERPRINT } from '../lib/prompt-modules/quantum-fingerprint.js';

const apiSource = readFileSync('api/interpret.js', 'utf8');

assert.match(apiSource, /import \{ PRISM_QUANTUM_FINGERPRINT \} from '\.\.\/lib\/prompt-modules\/quantum-fingerprint\.js';/);
assert.match(apiSource, /\$\{PRISM_QUANTUM_FINGERPRINT\}/);

for (const principle of [
  'RELATIONALITY',
  'CONTEXT-SENSITIVITY',
  'NON-LOCALITY',
  'HOLISM',
  'LAW-LIKE STRUCTURE',
]) {
  assert.match(PRISM_QUANTUM_FINGERPRINT, new RegExp(principle));
}

assert.match(PRISM_QUANTUM_FINGERPRINT, /YHWH defines the principles; the principles do not define YHWH\./);
assert.match(PRISM_QUANTUM_FINGERPRINT, /never claim that quantum mechanics independently proves YHWH/i);
assert.match(PRISM_QUANTUM_FINGERPRINT, /This layer should usually remain implicit\./);
assert.match(PRISM_QUANTUM_FINGERPRINT, /convergent corroboration/i);

assert.ok(PRISM_QUANTUM_FINGERPRINT.includes(PRISM_OPEN_INQUIRY), 'Every existing shared-layer consumer must receive the open-inquiry amendment');
for (const marker of ['async function runDisabledFollowUpFallback', 'system: PRISM_RESPONSE_REFRESH + PRISM_QUANTUM_FINGERPRINT']) assert.ok(apiSource.includes(marker));

console.log('Quantum fingerprint constitutional layer verified.');
