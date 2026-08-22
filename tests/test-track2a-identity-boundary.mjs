import assert from 'node:assert/strict';
import fs from 'node:fs';

const client = fs.readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const followups = fs.readFileSync(new URL('../api/followups.js', import.meta.url), 'utf8');
const share = fs.readFileSync(new URL('../api/share.js', import.meta.url), 'utf8');

assert.doesNotMatch(client, /setItem\(['"]qt_user_password['"]/,
  'password material must never be persisted');
assert.doesNotMatch(client, /btoa\(password\)/,
  'password material must not be reversibly encoded for persistence');
assert.match(client, /getSupabaseClient\(\)\.auth\.getSession\(\)/,
  'client identity must hydrate from the Supabase session');
assert.match(client, /return verifiedAuthState\.authenticated \? verifiedAuthState\.email : null/,
  'browser-stored email must not establish signed-in state');
assert.match(client, /await getSupabaseClient\(\)\.auth\.signOut\(\)/,
  'sign-out must revoke the verified Supabase session');

assert.doesNotMatch(followups, /getSubscriberId/,
  'ownership and membership must not derive their person ID from subscribers.id');
assert.match(followups, /req\.verifiedIdentity\?\.userId/g,
  'authenticated ownership and membership must use auth.users.id');

assert.match(share, /Verified authentication is required to create a share/,
  'anonymous share creation must be rejected');
assert.match(share, /owner_user_id=eq\.\$\{encodeURIComponent\(senderUserId\)\}/,
  'share creation must verify artifact ownership with the authenticated UUID');
assert.match(share, /responseFromArtifact\(artifact, packets\)/,
  'share snapshots must be reconstructed from the persisted server artifact');
assert.doesNotMatch(share, /const \{ snapshot,/,
  'a client-supplied snapshot must not authorize or define a share');

console.log('Track 2A identity authority boundary checks passed.');
