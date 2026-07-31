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

console.log('resource authorization security tests passed');
