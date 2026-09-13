import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const client = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const shareApi = readFileSync(new URL('../api/share.js', import.meta.url), 'utf8');
const followupsApi = readFileSync(new URL('../api/followups.js', import.meta.url), 'utf8');
const interpretApi = readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');

assert.match(client, /<option value="viewer">Read Only/);
assert.match(client, /<option value="contributor">View\/Edit/);
assert.match(client, /id="shareRecipientName"[^>]+required|id="shareRecipientName"/);
assert.match(client, /id="shareRecipientName"[^>]+autocapitalize="none"[^>]+autocorrect="off"[^>]+spellcheck="false"/);
assert.match(client, /Your notes remain private/);
assert.match(client, /class="share-invite-card"/);
assert.match(client, /The Prism prepares the greeting and link automatically/);
assert.match(client, /id="shareInvitedBy" class="share-inviter-value"/);
assert.doesNotMatch(client, /id="shareInvitedBy"[^>]*readonly|id="shareInviteNote"|Personal note/);
assert.match(client, /recipientInput\.readOnly = false[\s\S]*recipientInput\.disabled = false[\s\S]*recipientInput\.focus\(\)/);
assert.match(client, /function stabilizeRecipientNameInput\(input\)[\s\S]*keydown[\s\S]*event\.stopPropagation\(\)[\s\S]*keyup[\s\S]*event\.stopPropagation\(\)/);
assert.match(client, /function titleCaseRecipientName\(value\)[\s\S]*letter\.toUpperCase\(\)/);
assert.match(client, /stabilizeRecipientNameInput\(recipientInput\)[\s\S]*recipientInput\.readOnly = false/);
assert.match(client, /titleCaseRecipientName\(recipientEl\.value\)\.trim\(\)\.replace\(\/\\s\+\/g, ' '\)/);
assert.match(client, /send\.textContent = 'Send Invite'/);
assert.match(client, /function sendConnectionInvite\(connection\)[\s\S]*navigator\.share\(shareData\)/);
assert.match(client, /text: connectionInviteText\(connection, true\)/);
assert.doesNotMatch(client, /text: connectionInviteText\(connection, false\)[\s\S]*url: connectionUrl\(connection\)/);
assert.match(client, /Link ready for [\s\S]*Choose Send Invite or Copy Link/);
assert.doesNotMatch(client, /if \(recipientEl\) recipientEl\.value = '';\s*await copyConnectionInvite\(connection\)/);
assert.match(client, /function openPersonalShareSurface\(nodeId, queryText\)[\s\S]*openSharePanel\(\)/);
assert.doesNotMatch(client, /openShareSurface\(nodeId, queryText\)|id="circleShareBox"/);
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
