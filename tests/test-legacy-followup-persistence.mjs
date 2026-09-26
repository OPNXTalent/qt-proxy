import assert from 'node:assert/strict';
import fs from 'node:fs';

const client = fs.readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const followups = fs.readFileSync(new URL('../api/followups.js', import.meta.url), 'utf8');
const interpret = fs.readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const { recoveryId } = await import('../api/followups.js');
const threadId = 'a381f890-4471-4b5b-9e24-71448954cc05';
assert.equal(recoveryId(threadId, 0, 'Question', 'Answer'), recoveryId(threadId, 0, 'Question', 'Answer'));
assert.notEqual(recoveryId(threadId, 0, 'Question', 'Answer'), recoveryId(threadId, 1, 'Question', 'Answer'));

const saveStart = client.indexOf('function saveFollowUp(');
const saveEnd = client.indexOf('\n// RENAME', saveStart);
assert.ok(saveStart >= 0 && saveEnd > saveStart, 'saveFollowUp boundary must remain present');
const saveFollowUp = client.slice(saveStart, saveEnd);

assert.match(saveFollowUp, /if \(canActAsThreadMember\(\)\) \{[\s\S]*if \(runtimeDisabled\) syncLocalFollowUps\(storageThreadId, list\);[\s\S]*return;/,
  'canonical owner follow-ups must exit; disabled-runtime responses sync their local history');
assert.doesNotMatch(saveFollowUp, /'x-user-email':\s*userEmail\(\)/,
  'owner follow-up completion must not invoke an authenticated legacy POST');
assert.match(saveFollowUp, /localStorage\.setItem\(key, JSON\.stringify\(list\)\)/,
  'local compatibility history remains available');
assert.match(followups, /LEGACY_FOLLOWUP_WRITE_RETIRED/,
  'accidental legacy writes must fail explicitly');
assert.match(followups, /body\?\.action === 'recover_local'/,
  'local recovery must use an explicit, owner-checked action');
assert.match(followups, /threads\?id=eq\.[^`]*user_id=eq\./,
  'local recovery must verify the thread owner on the server');
assert.doesNotMatch(followups, /owner follow-up insert failed/,
  'the duplicate owner insertion path must be absent');

assert.match(followups, /req\.method === 'GET'/,
  'historical follow-up reads remain supported');
assert.match(followups, /follow_ups\?thread_id=eq\./,
  'GET continues reading historical follow_ups rows');
assert.match(followups, /req\.method === 'DELETE'/,
  'existing historical contributions remain manageable');

assert.match(interpret, /completeFollowUpArtifact\(\{[\s\S]*artifact:\s*followUpArtifact/,
  'canonical completion remains the authoritative follow-up persistence path');
assert.match(interpret, /revision:\s*Math\.max\(previousState\.version \+ 1, restored\.artifactRevision \+ 1\)/,
  'canonical follow-up revision progression remains intact');
assert.match(interpret, /complete_followup_interpretation_artifact/,
  'the exactly-once canonical completion RPC remains in use');

console.log('Legacy follow-up persistence retirement checks passed');
