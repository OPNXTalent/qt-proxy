import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const qt = fs.readFileSync(new URL('../qt.html', import.meta.url), 'utf8');

test('crisis acknowledgement resumes interpretation without weakening child-abuse intercept', () => {
  const childPos = api.indexOf('if (detectChildAbuse(lastUserText))');
  const ackPos = api.indexOf("const crisisAcknowledged = req.body?.crisisAcknowledged === true;");
  const crisisPos = api.indexOf('if (!crisisAcknowledged && detectCrisis(lastUserText))');
  assert.ok(childPos >= 0, 'child-abuse intercept missing');
  assert.ok(ackPos > childPos, 'crisis acknowledgement must be evaluated after child-abuse interception');
  assert.ok(crisisPos > ackPos, 'crisis detector must be gated by explicit acknowledgement');
});

test('client pauses at safety panel and retries the same inquiry only after Continue', () => {
  assert.match(qt, /async function callProxy\(messages, rawQuery, requestId, options\)/);
  assert.match(qt, /crisisAcknowledged: options\.crisisAcknowledged === true/);
  assert.match(qt, /if \(bodyData\.crisis\) \{\s*await showCrisisPanel\(\);\s*return callProxy\(messages, rawQuery, requestId, \{ crisisAcknowledged: true \}\);/s);
  assert.match(qt, /return new Promise\(function\(resolve\) \{\s*_crisisContinueResolver = resolve;/s);
  assert.match(qt, /var continueInquiry = _crisisContinueResolver;[\s\S]*continueInquiry\(\);/);
});
