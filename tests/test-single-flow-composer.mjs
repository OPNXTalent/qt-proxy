import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const frontend = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');

assert.equal(
  (frontend.match(/<textarea\b[^>]*class="input-field"/g) || []).length,
  1,
  'The query experience must expose one input-field textarea',
);
assert.match(
  frontend,
  /id="queryComposer"[\s\S]*id="userInput"[\s\S]*onclick="submitComposer\(\)"/,
  'The opening query must use the shared composer',
);
assert.doesNotMatch(
  frontend,
  /id="followUpInput"|id="followUpBtn"|id="followUpMicBtn"/,
  'A second follow-up composer must not return',
);
assert.match(
  frontend,
  /function showFollowUpComposer\(\)[\s\S]*section\.appendChild\(composer\)/,
  'The shared composer must move below the result flow',
);
assert.match(
  frontend,
  /function showOpeningComposer\(\)[\s\S]*slot\.appendChild\(composer\)/,
  'New Subject must restore the same composer to the opening position',
);
assert.match(
  frontend,
  /function submitComposer\(\)[\s\S]*composer\.parentElement === followUpSection[\s\S]*runFollowUp\(\)[\s\S]*runInterpretation\(\)/,
  'Submission behavior must follow the composer position',
);

console.log('Single-flow composer contract checks passed.');
