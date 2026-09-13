import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const client = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const shareApi = readFileSync(new URL('../api/share.js', import.meta.url), 'utf8');
const followupsApi = readFileSync(new URL('../api/followups.js', import.meta.url), 'utf8');
const interpretApi = readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');

assert.match(client, /<option value="viewer">Read Only<\/option>/);
assert.match(client, /<option value="contributor">View\/Edit<\/option>/);
assert.match(client, /id="shareRecipientName"[^>]+required|id="shareRecipientName"/);
assert.match(client, /Your notes always remain private/);
assert.match(client, /function updateJoinCircleVisibility\(\)[\s\S]*box\.style\.display = 'none'/);
assert.match(client, /window\._sharedViewPermission === 'contributor'[\s\S]*source: 'recipient'/);
assert.match(client, /window\._sharedViewPermission === 'viewer'[\s\S]*window\._sharedViewForkThreadId/);
assert.match(client, /5 guest credits/);
assert.match(client, /shareToken: isFollowUp \? \(window\._sharedViewToken/);

assert.match(shareApi, /randomBytes\(24\)\.toString\('base64url'\)/);
assert.match(shareApi, /recipient_name:\s+normalizedRecipientName/);
assert.match(shareApi, /owner_user_id=eq/);
assert.match(followupsApi, /share\.permission === 'viewer'[\s\S]*fork_shared_prism_inquiry/);
assert.match(followupsApi, /permission=eq\.contributor/);
assert.match(followupsApi, /display_name:\s+shares\[0\]\.recipient_name/);
assert.match(interpretApi, /getActiveSharedAccess/);

console.log('Personal sharing contract checks passed.');
