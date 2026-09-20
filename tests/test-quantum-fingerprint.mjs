import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

console.log('Quantum fingerprint constitutional layer verified.');
