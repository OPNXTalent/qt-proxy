import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
const { classifyFollowUpContext, requireVerifiedFollowUp } = await import('../api/interpret.js');
const threadId = 'e180deb3-6509-44e7-a546-063c0aa38469';
const guestId = '11111111-1111-4111-8111-111111111111';

test('restored guest thread requires the server-verified guest owner, never a bare client hint', async () => {
  const original = globalThis.fetch;
  const requests = [];
  try {
    globalThis.fetch = async url => {
      requests.push(url);
      const u = new URL(url);
      const owned = u.pathname === '/rest/v1/threads'
        && u.searchParams.get('id') === `eq.${threadId}`
        && u.searchParams.get('guest_id') === `eq.${guestId}`
        && u.searchParams.get('user_id') === 'is.null';
      return new Response(JSON.stringify(owned ? [{ id: threadId }] : []));
    };
    const owned = await classifyFollowUpContext({ clientHint: true, threadId, guestId });
    assert.deepEqual(owned, { isFollowUp: true, reason: 'owned_guest_thread' });
    requireVerifiedFollowUp(true, owned);
    const other = await classifyFollowUpContext({ clientHint: true, threadId,
      guestId: '22222222-2222-4222-8222-222222222222' });
    assert.equal(other.isFollowUp, false);
    assert.throws(() => requireVerifiedFollowUp(true, other), /FOLLOWUP_CONTEXT_UNVERIFIED/);
    const noPrincipal = await classifyFollowUpContext({ clientHint: true, threadId });
    assert.equal(noPrincipal.isFollowUp, false);
    assert.throws(() => requireVerifiedFollowUp(true, noPrincipal), /FOLLOWUP_CONTEXT_UNVERIFIED/);
    requireVerifiedFollowUp(false, noPrincipal);
    assert.equal(requests.length, 2);
  } finally { globalThis.fetch = original; }
});

test('a failed ownership lookup cannot authorize continuation', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{}', { status: 500 });
    const result = await classifyFollowUpContext({ clientHint: true, threadId, guestId });
    assert.throws(() => requireVerifiedFollowUp(true, result), /FOLLOWUP_CONTEXT_UNVERIFIED/);
  } finally { globalThis.fetch = original; }
});
