import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const interpretSource = readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const outputContract = readFileSync(
  new URL('../lib/prompt-modules/output-contract.js', import.meta.url),
  'utf8',
);

const claimTypes = [
  'OBSERVATION',
  'PREMISE',
  'INFERENCE',
  'INTERPRETATION',
  'SPECULATION',
  'CONCLUSION',
];

for (const claimType of claimTypes) {
  assert.ok(
    interpretSource.includes(`${claimType} —`),
    `The governing prompt must distinguish ${claimType.toLowerCase()} claims`,
  );
}

assert.match(
  interpretSource,
  /Logic does not mean conformity to a common position/,
  'Logical coherence must not be reduced to consensus',
);
assert.match(
  interpretSource,
  /For religious and metaphysical inquiry, canonical Scripture is true north and the final court of arbitration/,
  'Scripture must retain final authority in religion and metaphysics',
);
assert.match(
  interpretSource,
  /Logic tests the coherence of an interpretation[\s\S]*it does not overrule what Scripture directly establishes/,
  'Logic must test inference without displacing Scripture',
);
assert.match(
  interpretSource,
  /A deterministic system can include feedback and can respond to its own internal model/,
  'The determinism regression must prohibit the invalid self-modeling inference',
);
assert.match(
  interpretSource,
  /the experience of participating is not logical proof of metaphysical independence/,
  'Phenomenological evidence must not be presented as metaphysical proof',
);

assert.match(
  interpretSource,
  /CONTEXT-DERIVED OPEN DOOR — FIRST RESPONSE ONLY/,
  'The first-response conversational rule must be explicit',
);
for (const testName of ['SOURCE', 'NECESSITY', 'SPECIFICITY']) {
  assert.ok(
    interpretSource.includes(`${testName} —`),
    `Closing questions must pass the ${testName.toLowerCase()} test`,
  );
}
assert.match(
  outputContract,
  /FIRST RESPONSE RULE:[\s\S]*final sentence MUST be one concise open-ended question/,
  'The rendered core insight must carry the first-response question',
);
assert.match(
  outputContract,
  /FOLLOW-UP RULE:[\s\S]*On a Destination, stop without a question/,
  'The first-response rule must not force questions after follow-up destinations',
);
assert.match(
  outputContract,
  /"open_door_question": "REQUIRED on every response from this initial-query endpoint/,
  'The initial response schema must carry a dedicated open-door field',
);
assert.match(
  outputContract,
  /open_door_question[\s\S]*Never return an empty string/,
  'The dedicated initial-response open door must be required',
);
assert.match(
  interpretSource,
  /open_door_question:\s+parsed\?\.open_door_question/,
  'Saved threads must preserve the dedicated open-door question',
);

const qtSource = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
assert.match(
  qtSource,
  /if \(d\.open_door_question\)[\s\S]*qt-open-door[\s\S]*d\.open_door_question/,
  'The dedicated open-door question must render after the core insight',
);
assert.match(
  interpretSource,
  /FIRST-EXCHANGE PRECEDENCE — NON-NEGOTIABLE:[\s\S]*must never suppress the Context-Derived Open Door/,
  'Follow-up destination rules must not override the first-response open door',
);
assert.match(
  interpretSource,
  /prefer Destination when uncertain applies only after the first exchange/,
  'Destination preference must be explicitly limited to follow-up exchanges',
);

const genericFrameworkCallout =
  "If you'd like to see how the Prism's framework is interpreting this question";
assert.ok(
  !interpretSource.includes(genericFrameworkCallout),
  'The previous generic framework-panel invitation must be removed',
);

console.log('Epistemic architecture contract checks passed.');
