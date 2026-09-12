import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://project.test';
process.env.SUPABASE_ANON_KEY = 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

const { default: handler } = await import('../api/share.js');

function response(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function request(body, { authenticated = false } = {}) {
  return {
    method: 'POST',
    url: '/api/share',
    query: {},
    headers: authenticated ? { authorization: 'Bearer verified-token' } : {},
    body,
  };
}

function reply() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };
}

async function run(body, routes, options) {
  const calls = [];
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    for (const route of routes) {
      if (route.match(String(url), init)) return route.respond(String(url), init);
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  const res = reply();
  await handler(request(body, options), res);
  return { res, calls };
}

const authRoute = {
  match: url => url.endsWith('/auth/v1/user'),
  respond: () => response(200, { id: '11111111-1111-4111-8111-111111111111', email: 'member@example.test' }),
};

{
  const { res, calls } = await run(
    { action: 'comment', shareId: 'share-1', token: 'viewer-token', content: 'hello' },
    [{
      match: url => url.includes('/shares?') && url.includes('token=eq.viewer-token'),
      respond: () => response(200, [{ id: 'share-1', owner_user_id: 'owner', permission: 'viewer', revoked_at: null }]),
    }],
  );
  assert.equal(res.statusCode, 403, 'Viewer must not be able to comment');
  assert.equal(calls.some(call => call.url.includes('/share_chat_messages')), false);
}

{
  const { res, calls } = await run(
    { action: 'comment', shareId: 'share-1', token: 'contributor-token', content: 'hello' },
    [authRoute, {
      match: url => url.includes('/shares?') && url.includes('token=eq.contributor-token'),
      respond: () => response(200, [{ id: 'share-1', owner_user_id: 'owner', permission: 'contributor', revoked_at: null }]),
    }, {
      match: url => url.endsWith('/share_chat_messages'),
      respond: () => response(201, [{ id: 'comment-1' }]),
    }],
    { authenticated: true },
  );
  assert.equal(res.statusCode, 200, 'Contributor should be able to comment');
  assert.equal(calls.filter(call => call.url.endsWith('/share_chat_messages')).length, 1);
}

{
  const { res, calls } = await run(
    { action: 'fork', shareId: 'share-1', token: 'revoked-token' },
    [authRoute, {
      match: url => url.includes('/shares?') && url.includes('token=eq.revoked-token'),
      respond: () => response(200, []),
    }],
    { authenticated: true },
  );
  assert.equal(res.statusCode, 410, 'Revoked/invalid credentials must not fork');
  assert.equal(calls.some(call => call.url.includes('/rpc/fork_shared_prism_inquiry')), false);
}

{
  const { res, calls } = await run(
    { action: 'fork', shareId: 'share-1', token: 'active-token' },
    [authRoute, {
      match: url => url.includes('/shares?') && url.includes('token=eq.active-token'),
      respond: () => response(200, [{ id: 'share-1', owner_user_id: 'owner', permission: 'viewer', revoked_at: null }]),
    }, {
      match: url => url.endsWith('/rpc/fork_shared_prism_inquiry'),
      respond: () => response(200, [{
        fork_thread_id: 'thread-fork', fork_artifact_id: 'artifact-fork', artifact_revision: 1, already_forked: false,
      }]),
    }],
    { authenticated: true },
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.threadId, 'thread-fork');
  assert.equal(calls.filter(call => call.url.endsWith('/rpc/fork_shared_prism_inquiry')).length, 1);
}

console.log('Trust Circle credential and permission boundary checks passed');
