import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

process.env.SUPABASE_URL = 'https://correct-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-test-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-key';
process.env.OPENAI_API_KEY = 'openai-test-key';
process.env.ANTHROPIC_API_KEY = 'anthropic-test-key';
process.env.VERCEL_ENV = 'preview';
process.env.PREVIEW_TEST_USER_IDS = '11111111-1111-4111-8111-111111111111';
process.env.PREVIEW_TEST_QUERY_ALLOWANCE = '40';

const {
  extractBearerToken,
  getPreviewTestEntitlement,
  verifySupabaseIdentity,
} = await import('../lib/server-auth.js');

const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';

assert.equal(extractBearerToken('Bearer valid-token'), 'valid-token');
assert.equal(extractBearerToken('Bearer token with spaces'), null);
assert.equal(extractBearerToken(null), null);

const missing = await verifySupabaseIdentity({
  authorizationHeader: null,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  fetchImpl: async () => assert.fail('Missing authentication must not call Supabase'),
});
assert.deepEqual(missing, { provided: false, identity: null });

for (const token of ['invalid-token', 'expired-token', 'wrong-project-token']) {
  const result = await verifySupabaseIdentity({
    authorizationHeader: `Bearer ${token}`,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://correct-project.supabase.co/auth/v1/user');
      assert.equal(options.headers.Authorization, `Bearer ${token}`);
      return Response.json({ message: 'invalid token' }, { status: 401 });
    },
  });
  assert.equal(result.provided, true);
  assert.equal(result.identity, null);
  assert.equal(result.error, 'invalid_authentication');
}

const verified = await verifySupabaseIdentity({
  authorizationHeader: 'Bearer valid-token',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  fetchImpl: async () => Response.json({
    id: TEST_USER_ID,
    email: 'Actual.User@Example.com',
  }),
});
assert.deepEqual(verified.identity, {
  userId: TEST_USER_ID,
  email: 'actual.user@example.com',
});

assert.deepEqual(getPreviewTestEntitlement({
  userId: TEST_USER_ID,
  deploymentEnvironment: 'preview',
  configuredUserIds: TEST_USER_ID,
  configuredAllowance: '40',
}), { allowance: 40 });
assert.equal(getPreviewTestEntitlement({
  userId: OTHER_USER_ID,
  deploymentEnvironment: 'preview',
  configuredUserIds: TEST_USER_ID,
  configuredAllowance: '40',
}), null);
assert.equal(getPreviewTestEntitlement({
  userId: TEST_USER_ID,
  deploymentEnvironment: 'production',
  configuredUserIds: TEST_USER_ID,
  configuredAllowance: '40',
}), null);
assert.equal(getPreviewTestEntitlement({
  userId: TEST_USER_ID,
  deploymentEnvironment: 'preview',
  configuredUserIds: `${TEST_USER_ID},malformed`,
  configuredAllowance: '40',
}), null);
assert.equal(getPreviewTestEntitlement({
  userId: TEST_USER_ID,
  deploymentEnvironment: 'preview',
  configuredUserIds: '',
  configuredAllowance: '40',
}), null, 'Removing the allowlist entry must revoke test access');
assert.equal(getPreviewTestEntitlement({
  userId: TEST_USER_ID,
  deploymentEnvironment: 'preview',
  configuredUserIds: TEST_USER_ID,
  configuredAllowance: '201',
}), null, 'Preview allowance must remain bounded');

let requestedSubscriberEmail = null;
let queryLogReads = 0;
let acknowledgedOwner = null;
globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  if (target.endsWith('/auth/v1/user')) {
    if (options.headers.Authorization === 'Bearer valid-token') {
      return Response.json({ id: TEST_USER_ID, email: 'actual.user@example.com' });
    }
    if (options.headers.Authorization === 'Bearer subscriber-token') {
      return Response.json({ id: OTHER_USER_ID, email: 'actual.user@example.com' });
    }
    if (options.headers.Authorization === 'Bearer preview-only-token') {
      return Response.json({ id: TEST_USER_ID, email: 'preview.only@example.com' });
    }
    if (options.headers.Authorization === 'Bearer non-subscriber-token') {
      return Response.json({ id: OTHER_USER_ID, email: 'non.subscriber@example.com' });
    }
    return Response.json({ message: 'invalid token' }, { status: 401 });
  }
  if (target.includes('/subscribers?')) {
    const match = target.match(/email=eq\.([^&]+)/);
    requestedSubscriberEmail = match ? decodeURIComponent(match[1]) : null;
    if (requestedSubscriberEmail === 'actual.user@example.com') {
      return Response.json([{
        id: '33333333-3333-4333-8333-333333333333',
        email: requestedSubscriberEmail,
        tier: 'free',
        status: 'active',
        query_count: 0,
        purchased_credits: 0,
      }]);
    }
    return Response.json([]);
  }
  if (target.includes('/code_redemptions?')) return Response.json([]);
  if (target.includes('/query_log?')) {
    queryLogReads += 1;
    if (target.includes('user_id=eq.')) {
      return new Response('[]', {
        status: 200,
        headers: { 'content-range': '0-0/0' },
      });
    }
    const now = new Date().toISOString();
    return Response.json([
      { id: 1, query_type: 'ip:127.0.0.1', cost: 1, created_at: now },
      { id: 2, query_type: 'ip:127.0.0.1', cost: 1, created_at: now },
      { id: 3, query_type: 'ip:127.0.0.1', cost: 1, created_at: now },
    ]);
  }
  if (target.includes('/rpc/commit_inquiry_state')) {
    const body = JSON.parse(options.body);
    acknowledgedOwner = body.p_owner_user_id;
    return Response.json([{
      committed: true,
      current_version: 1,
      current_state: body.p_state,
    }]);
  }
  throw new Error(`Unexpected fetch: ${target}`);
};

const { default: handler, issuePendingInquiryCommit } = await import('../api/interpret.js');

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.headers = new Map();
    this.statusCode = 200;
    this.headersSent = false;
    this.writableEnded = false;
    this.output = '';
  }
  setHeader(name, value) { this.headers.set(name.toLowerCase(), String(value)); }
  status(code) { this.statusCode = code; return this; }
  json(value) {
    this.headersSent = true;
    this.output = JSON.stringify(value);
    this.writableEnded = true;
    return this;
  }
  write(value) { this.headersSent = true; this.output += String(value); return true; }
  end() { this.writableEnded = true; return this; }
}

function request({ method = 'GET', url = '/api/interpret', token = null, body = null } = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = {
    host: 'localhost',
    'x-forwarded-for': '127.0.0.1',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
  req.socket = { remoteAddress: '127.0.0.1' };
  req.body = body;
  return req;
}

let res = new MockResponse();
await handler(request({
  url: '/api/interpret?email=paid.customer%40example.com',
}), res);
assert.equal(res.statusCode, 200);
assert.equal(JSON.parse(res.output).locked, true);
assert.equal(requestedSubscriberEmail, null, 'Forged body/query email must not trigger subscriber lookup');

res = new MockResponse();
await handler(request({ token: 'invalid-token' }), res);
assert.equal(res.statusCode, 401);
assert.equal(requestedSubscriberEmail, null);

res = new MockResponse();
requestedSubscriberEmail = null;
await handler(request({
  token: 'subscriber-token',
  url: '/api/interpret?email=paid.customer%40example.com',
}), res);
assert.equal(res.statusCode, 200);
assert.equal(requestedSubscriberEmail, 'actual.user@example.com');
assert.deepEqual(JSON.parse(res.output), {
  locked: false,
  authenticated: true,
});

res = new MockResponse();
requestedSubscriberEmail = null;
await handler(request({ token: 'preview-only-token' }), res);
assert.equal(res.statusCode, 200);
assert.equal(requestedSubscriberEmail, null, 'Preview entitlement must not require a billing subscriber row');
assert.deepEqual(JSON.parse(res.output), {
  locked: false,
  queriesUsed: 0,
  limit: 40,
  previewTestAccess: true,
});

res = new MockResponse();
requestedSubscriberEmail = null;
await handler(request({
  token: 'non-subscriber-token',
  url: '/api/interpret?email=paid.customer%40example.com',
}), res);
assert.equal(res.statusCode, 200);
assert.equal(requestedSubscriberEmail, 'non.subscriber@example.com');
assert.equal(JSON.parse(res.output).locked, true);

res = new MockResponse();
requestedSubscriberEmail = null;
await handler(request({
  method: 'POST',
  body: {
    email: 'paid.customer@example.com',
    userId: OTHER_USER_ID,
    tier: 'full_spectrum',
    subscriber: true,
    allowance: 200,
    role: 'admin',
    rawQuery: 'A forged request must remain on the anonymous path.',
    messages: [{ role: 'user', content: 'A forged request must remain on the anonymous path.' }],
  },
}), res);
assert.equal(res.statusCode, 429);
assert.equal(requestedSubscriberEmail, null);
assert.ok(queryLogReads > 0);

const ownedPendingCommit = issuePendingInquiryCommit({
  inquiryKey: 'thread:authorization-test',
  expectedVersion: 0,
  state: { schemaVersion: 1, turn: 1 },
  threadId: 'authorization-test',
  ownerUserId: OTHER_USER_ID,
  requestId: 'authorization_pending_commit',
});
res = new MockResponse();
await handler(request({
  method: 'POST',
  token: 'subscriber-token',
  body: {
    operation: 'commit_inquiry_state',
    pendingCommitToken: ownedPendingCommit,
    requestId: 'authorization_acknowledgement',
  },
}), res);
assert.equal(res.statusCode, 200);
assert.equal(JSON.parse(res.output).committed, true);
assert.equal(
  acknowledgedOwner,
  OTHER_USER_ID,
  'Canonical state must be owned by the verified auth.users identity, not the subscriber row UUID',
);

acknowledgedOwner = null;
res = new MockResponse();
await handler(request({
  method: 'POST',
  token: 'preview-only-token',
  body: {
    operation: 'commit_inquiry_state',
    pendingCommitToken: ownedPendingCommit,
    requestId: 'authorization_cross_account_acknowledgement',
  },
}), res);
assert.equal(res.statusCode, 403);
assert.equal(acknowledgedOwner, null, 'A different verified identity must not commit pending state');

console.log('subscriber authorization security tests passed');
