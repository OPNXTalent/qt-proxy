import test from 'node:test';
import assert from 'node:assert/strict';
import { callEmbedding } from '../lib/embedding-provider.js';

const body = () => ({ model: 'text-embedding-3-small', data: [{ index: 0,
  embedding: Array(1536).fill(0.25) }], usage: { prompt_tokens: 11, total_tokens: 11 } });
const response = data => new Response(JSON.stringify(data), { headers: { 'x-request-id': 'req_embed' } });
const options = { input: 'private inquiry', requestId: 'app-request', turnType: 'primary' };

test('embedding returns vector and records attributable usage without private data', async () => {
  const logs = [], timing = [];
  const vector = await callEmbedding({ ...options, onTelemetry: t => timing.push(t) }, {
    apiKey: 'private-key', fetchImpl: async (url, init) => {
      assert.equal(url, 'https://api.openai.com/v1/embeddings');
      assert.equal(JSON.parse(init.body).input, options.input);
      return response(body());
    }, log: (...args) => logs.push(args),
  });
  assert.equal(vector.length, 1536);
  assert.equal(logs.length, 1);
  assert.equal(timing[0].inputTokens, 11);
  assert.equal(timing[0].totalTokens, 11);
  assert.equal(timing[0].providerRequestId, 'req_embed');
  assert.equal(timing[0].requestId, 'app-request');
  assert.equal(timing[0].usageKnown, true);
  assert.equal(timing[0].succeeded, true);
  assert.doesNotMatch(JSON.stringify(logs), /private inquiry|private-key|0\.25/);
});

test('missing or invalid usage is unknown, never zero; vector is not used', async () => {
  for (const usage of [undefined, { prompt_tokens: -1, total_tokens: -1 },
    { prompt_tokens: 11, total_tokens: 12 }, { prompt_tokens: '11', total_tokens: 11 }]) {
    const logs = [];
    await assert.rejects(callEmbedding(options, { apiKey: 'test',
      fetchImpl: async () => response({ ...body(), usage }),
      log: (_, t) => logs.push(t) }), /EMBEDDING_USAGE_INVALID/);
    assert.equal(logs[0].usageKnown, false);
    assert.equal(logs[0].inputTokens, null);
    assert.equal(logs[0].succeeded, false);
  }
});

test('malformed vector retains known billed usage; provider failures do not retry or leak errors', async () => {
  let calls = 0;
  const logs = [];
  await assert.rejects(callEmbedding(options, { apiKey: 'test',
    fetchImpl: async () => { calls++; return response({ ...body(), data: [] }); },
    log: (_, t) => logs.push(t) }), /EMBEDDING_RESPONSE_INVALID/);
  assert.equal(calls, 1);
  assert.equal(logs[0].inputTokens, 11);
  assert.equal(logs[0].succeeded, false);
  await assert.rejects(callEmbedding(options, { apiKey: 'test',
    fetchImpl: async () => new Response('private-key private inquiry', { status: 429 }),
    log() {} }), /^Error: EMBEDDING_HTTP_429$/);
});

test('deadline covers stalled headers and body with unknown billing and no retry', async () => {
  for (const fetchImpl of [async () => new Promise(() => {}),
    async () => ({ ok: true, status: 200, headers: new Headers(), json: () => new Promise(() => {}) })]) {
    const logs = [];
    await assert.rejects(callEmbedding({ ...options, timeoutMs: 10 }, {
      apiKey: 'test', fetchImpl, log: (_, t) => logs.push(t) }), /EMBEDDING_TIMEOUT/);
    assert.equal(logs[0].usageKnown, false);
    assert.equal(logs[0].retryOrdinal, 0);
  }
});
