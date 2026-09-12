import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const restore = api.slice(
  api.indexOf('async function restoreCanonicalInquiryState'),
  api.indexOf('async function runPersistentInquiryFollowUp'),
);
const anonymousPath = api.slice(
  api.indexOf("timing('anonymous_access_start')"),
);

assert.match(restore, /select=artifact_id,artifact_revision,inquiry_key,thread_id,owner_user_id,guest_id/);
assert.match(restore, /ownerUserId\s*\?\s*candidate\?\.owner_user_id === ownerUserId && !candidate\?\.guest_id/);
assert.match(restore, /Boolean\(guestId\) && candidate\?\.guest_id === guestId && !candidate\?\.owner_user_id/);
assert.match(restore, /!candidate \|\| !threadMatches \|\| !principalMatches/);
assert.match(anonymousPath, /runPersistentInquiryFollowUp\([\s\S]*?guestId: guestIdentity\?\.guestId \|\| null/);

console.log('Guest follow-up artifact lineage authority checks passed.');
