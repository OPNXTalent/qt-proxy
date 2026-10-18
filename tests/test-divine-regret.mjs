import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldLoadDivineRegret as gate } from '../lib/prompt-modules/divine-regret.js';

for (const q of [
  'Why did God regret making Saul king?', 'Can God change his mind?',
  'Does divine foreknowledge make grief unreal?', '1 Samuel 15:29',
  'I Samuel 15:35', 'What does nacham mean?', 'Is divine grief real?',
  'How can regret coexist with God knowing everything?',
]) assert.equal(gate(q), true, q);
for (const q of [
  '', null, undefined, 42, 'What is reality?', 'Explain John 18:37',
  'I regret buying a house.', 'How do I repent?', 'Did Saul build a monument?',
  'God loves people. I regret my decision.', 'Explain 1 Samuel 150',
]) assert.equal(gate(q), false, String(q));
const source = readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
assert.equal((source.match(/const divineRegretModule = shouldLoadDivineRegret/g) || []).length, 2);
assert.equal((source.match(/\+ \(divineRegretModule \? PRISM_DIVINE_REGRET : ''\)/g) || []).length, 2);
console.log('Divine regret routing and both prompt assembly paths passed.');
