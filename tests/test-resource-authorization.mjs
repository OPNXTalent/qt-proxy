import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://correct-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-test-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-key';

const [{ default: threadsHandler }, { default: migrateHandler }, { default: welcomeHandler }, { default: followupsHandler }] =
  await Promise.all([
    import('../api/threads.js'),
    import('../api/migrate.js'),
    import('../api/welcome.js'),
    import('../api/followups.js'),
  ]);

function responseCapture() {
  let resolve;
  const completed = new Promise(done => { resolve = done; });
  return {
    completed,
    headers: {},
    statusCode: 200,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { resolve({ status: this.statusCode, body, headers: this.headers }); return this; },
    end() { resolve({ status: this.statusCode, body: null, headers: this.headers }); return this; },
  };
}

async function invoke(handler, req) {
  const res = responseCapture();
  await handler({
    method: 'POST',
    headers: {},
    query: {},
    url: '/',
    body: {},
    ...req,
  }, res);
  return res.completed;
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => assert.fail('Forged client identity must not reach privileged storage');

try {
  const forgedHeaders = { 'x-user-email': 'victim@example.com' };

  const threads = await invoke(threadsHandler, { method: 'GET', headers: forgedHeaders });
  assert.equal(threads.status, 401);

  const migrate = await invoke(migrateHandler, {
    headers: forgedHeaders,
    body: { threads: [{ id: 'forged' }] },
  });
  assert.equal(migrate.status, 401);

  const welcome = await invoke(welcomeHandler, {
    headers: forgedHeaders,
    body: { email: 'victim@example.com' },
  });
  assert.equal(welcome.status, 401);

  const claim = await invoke(followupsHandler, {
    url: '/api/followups?action=claim-anon-session',
    query: { action: 'claim-anon-session' },
    headers: forgedHeaders,
    body: {
      anonId: 'anon_forged',
      userEmail: 'victim@example.com',
      threadId: '11111111-1111-4111-8111-111111111111',
    },
  });
  assert.equal(claim.status, 400);
} finally {
  globalThis.fetch = originalFetch;
}

const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';
let privilegedOwnerLookup = null;
globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  if (target.endsWith('/auth/v1/user')) {
    assert.equal(options.headers.Authorization, 'Bearer preview-token');
    return Response.json({ id: TEST_USER_ID, email: 'preview@example.com' });
  }
  if (target.includes('/subscribers?')) return Response.json([]);
  if (target.includes('/threads?user_id=eq.')) {
    privilegedOwnerLookup = target;
    return Response.json([{
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      user_id: TEST_USER_ID,
      title: 'Persisted inquiry',
      query: 'What persists?',
      response: { recognition: 'The inquiry persists.' },
      created_at: '2026-07-31T00:00:00.000Z',
      expires_at: '2026-08-02T00:00:00.000Z',
      grace_ends_at: '2026-09-01T00:00:00.000Z',
      retention_days: 1,
      visibility: 'private',
    }]);
  }
  if (target.includes('/thread_participants?')) return Response.json([]);
  throw new Error(`Unexpected fetch: ${target}`);
};

try {
  const previewThreads = await invoke(threadsHandler, {
    method: 'GET',
    headers: {
      authorization: 'Bearer preview-token',
      'x-user-email': 'victim@example.com',
    },
  });
  assert.equal(previewThreads.status, 200);
  assert.equal(previewThreads.body.tier, 'free');
  assert.equal(previewThreads.body.userId, TEST_USER_ID);
  assert.equal(previewThreads.body.threads.length, 1);
  assert.match(privilegedOwnerLookup, new RegExp(`user_id=eq\\.${TEST_USER_ID}`));
  assert.doesNotMatch(privilegedOwnerLookup, /victim/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('resource authorization security tests passed');
