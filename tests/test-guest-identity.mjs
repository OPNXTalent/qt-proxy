import assert from 'node:assert/strict';
import {
  clearGuestCookieHeader,
  guestCookieHeader,
  issueGuestIdentity,
  parseCookies,
  verifyGuestIdentity,
} from '../lib/guest-identity.js';

let stored = null;
let claimedBy = null;
const fetchImpl = async (url, options = {}) => {
  if (options.method === 'POST') {
    stored = JSON.parse(options.body);
    return new Response('', { status: 201 });
  }
  return Response.json([{ guest_id: stored.guest_id, secret_hash: stored.secret_hash, claimed_by: claimedBy }]);
};

const issued = await issueGuestIdentity({ supabaseUrl: 'https://example.test', serviceRoleKey: 'service', fetchImpl });
assert.equal(stored.secret_hash.length, 64);
assert.equal(stored.secret_hash.includes(issued.credential.split('.')[1]), false, 'Only a one-way secret hash may be persisted');
const cookie = guestCookieHeader(issued.credential);
assert.match(cookie, /HttpOnly/);
assert.match(cookie, /Secure/);
assert.match(cookie, /SameSite=Lax/);
assert.equal(parseCookies(`a=1; prism_guest=${encodeURIComponent(issued.credential)}`).prism_guest, issued.credential);
const verified = await verifyGuestIdentity({
  cookieHeader: `prism_guest=${encodeURIComponent(issued.credential)}`,
  supabaseUrl: 'https://example.test',
  serviceRoleKey: 'service',
  fetchImpl,
});
assert.equal(verified.guestId, issued.guestId);
claimedBy = '11111111-1111-4111-8111-111111111111';
assert.equal(await verifyGuestIdentity({
  cookieHeader: `prism_guest=${encodeURIComponent(issued.credential)}`,
  supabaseUrl: 'https://example.test',
  serviceRoleKey: 'service',
  fetchImpl,
}), null, 'A claimed credential must not resume an anonymous guest session');
const claimRetry = await verifyGuestIdentity({
  cookieHeader: `prism_guest=${encodeURIComponent(issued.credential)}`,
  supabaseUrl: 'https://example.test',
  serviceRoleKey: 'service',
  fetchImpl,
  allowClaimed: true,
});
assert.equal(claimRetry.claimedBy, claimedBy, 'A secure credential may retry the idempotent authenticated claim');
assert.match(clearGuestCookieHeader(), /Max-Age=0/);

console.log('secure guest identity checks passed');
