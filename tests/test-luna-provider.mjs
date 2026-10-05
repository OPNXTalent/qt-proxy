import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLunaRequest, callLunaModel, flattenSystem } from '../lib/luna-provider.js';

const usage = { input_tokens: 100, output_tokens: 12,
  input_tokens_details: { cached_tokens: 70, cache_write_tokens: 10 },
  output_tokens_details: { reasoning_tokens: 4 } };
const completed = (text = 'Visible answer.') => ({ id: 'resp_test', model: 'gpt-6-luna',
  status: 'completed', service_tier: 'default', usage,
  output: [{ type: 'reasoning', summary: [] },
    { type: 'message', content: [{ type: 'output_text', text }] }] });
const options = { maxTokens: 100, prompt: 'private question', timeoutMs: 1000 };
const json = data => new Response(JSON.stringify(data), { headers: { 'x-request-id': 'req_test' } });
const deps = fetchImpl => ({ fetchImpl, apiKey: 'test-key', log() {} });
function sse(events, split = 7) {
  const bytes = new TextEncoder().encode(events.map(e => `event: ${e.type}\r\ndata: ${JSON.stringify(e)}\r\n\r\n`).join(''));
  return new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += split) controller.enqueue(bytes.slice(i, i + split));
    controller.close();
  } }), { headers: { 'x-request-id': 'req_stream' } });
}

test('request preserves text and caps, drops Anthropic caching metadata and sampling settings', () => {
  const system = [{ type: 'text', text: 'canonical\n', cache_control: { type: 'ephemeral' } },
    { type: 'text', text: '\nsupplement' }];
  const request = buildLunaRequest({ ...options, system, temperature: 0.2 });
  assert.equal(flattenSystem(system), 'canonical\n\nsupplement');
  assert.equal(request.instructions, flattenSystem(system));
  assert.equal(request.max_output_tokens, 100);
  assert.equal(request.model, 'gpt-6-luna');
  assert.deepEqual(request.reasoning, { effort: 'low' });
  assert.equal(request.store, false);
  assert.equal(request.service_tier, 'default');
  assert.equal(request.temperature, undefined);
  assert.doesNotMatch(JSON.stringify(request), /cache_control/);
  assert.throws(() => buildLunaRequest({ ...options, model: 'claude-sonnet-4-6' }), /UNSUPPORTED/);
});

test('nonstream generation reports usage including reasoning once and exposes no secrets', async () => {
  const logs = [];
  const result = await callLunaModel(options, { ...deps(async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(init.headers.Authorization, 'Bearer test-key');
    assert.equal(JSON.parse(init.body).input, options.prompt);
    return json(completed());
  }), log: (...args) => logs.push(args) });
  assert.equal(result, 'Visible answer.');
  assert.equal(logs[0][1].outputTokens, 12);
  assert.equal(logs[0][1].reasoningTokens, 4);
  assert.equal(logs[0][1].cacheReadInputTokens, 70);
  assert.equal(logs[0][1].cacheCreationInputTokens, 10);
  assert.equal(logs[0][1].usageKnown, true);
  assert.equal(logs[0][1].providerRequestId, 'req_test');
  assert.doesNotMatch(JSON.stringify(logs), /private question|test-key|Visible answer/);
});

test('fragmented UTF-8 SSE forwards visible deltas and excludes reasoning', async () => {
  const deltas = [];
  const events = [{ type: 'response.reasoning_summary_text.delta', delta: 'internal' },
    { type: 'response.output_text.delta', delta: 'Café ' },
    { type: 'response.output_text.delta', delta: 'answer.' },
    { type: 'response.completed', response: completed('Café answer.') }];
  assert.equal(await callLunaModel({ ...options, onTextDelta: t => deltas.push(t) },
    deps(async () => sse(events, 1))), 'Café answer.');
  assert.deepEqual(deltas, ['Café ', 'answer.']);
});

test('forced function result preserves optional schema and structured progress', async () => {
  const schema = { type: 'object', properties: { answer: { type: 'string' } }, required: [] };
  const progress = [], diagnostics = [];
  const data = { ...completed(), output: [{ type: 'function_call', id: 'fc_1',
    name: 'emit_test', arguments: '{"answer":"yes"}' }] };
  const request = buildLunaRequest({ ...options, structuredOutputSchema: schema, structuredOutputName: 'emit_test' });
  assert.equal(request.tools[0].strict, false);
  assert.deepEqual(request.tools[0].parameters, schema);
  assert.equal(request.parallel_tool_calls, false);
  assert.deepEqual(await callLunaModel({ ...options, structuredOutputSchema: schema,
    structuredOutputName: 'emit_test', onStructuredInputProgress: p => progress.push(p),
    structuredOutputDiagnostic: d => diagnostics.push(d) }, deps(async () => sse([
      { type: 'response.output_item.added', output_index: 1, item: { id: 'fc_1', type: 'function_call', name: 'emit_test' } },
      { type: 'response.function_call_arguments.delta', item_id: 'fc_1', delta: '{"answer":' },
      { type: 'response.function_call_arguments.delta', item_id: 'fc_1', delta: '"yes"}' },
      { type: 'response.completed', response: data },
    ]))), { answer: 'yes' });
  assert.deepEqual(progress.at(-1), { index: 1, name: 'emit_test', partialJson: '{"answer":"yes"}' });
  assert.equal(diagnostics.at(-1).outcome, 'tool_use_returned');
  await assert.rejects(callLunaModel({ ...options, structuredOutputSchema: schema },
    deps(async () => json(completed()))), /STRUCTURED_OUTPUT_MISSING/);
});

test('partial, refused, usage-missing and malformed results never become success', async () => {
  for (const [data, error] of [
    [{ ...completed(), status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }, /OUTPUT_TRUNCATED/],
    [{ ...completed(), status: 'failed' }, /INCOMPLETE/],
    [{ ...completed(), usage: undefined }, /USAGE_INVALID/],
    [{ ...completed(), output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }, /REFUSED/],
  ]) await assert.rejects(callLunaModel(options, deps(async () => json(data))), error);
  await assert.rejects(callLunaModel({ ...options, onTextDelta() {} }, deps(async () => sse([
    { type: 'response.output_text.delta', delta: 'partial' },
  ]))), /STREAM_INCOMPLETE/);
  await assert.rejects(callLunaModel({ ...options, onTextDelta() {} }, deps(async () => sse([
    { type: 'response.output_text.delta', delta: 'different' },
    { type: 'response.completed', response: completed() },
  ]))), /STREAM_MISMATCH/);
});

test('HTTP rejection is safe, unknown charges remain unknown and there is no retry', async () => {
  let calls = 0; const logs = [];
  await assert.rejects(callLunaModel(options, { ...deps(async () => {
    calls++;
    return new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded', message: 'test-key private question' } }), { status: 429 });
  }), log: (...args) => logs.push(args) }), /INQUIRY_MODEL_429:rate_limit_exceeded/);
  assert.equal(calls, 1);
  assert.equal(logs[0][1].succeeded, false);
  assert.equal(logs[0][1].usageKnown, false);
  assert.equal(logs[0][1].inputTokens, null);
  assert.doesNotMatch(JSON.stringify(logs), /test-key|private question/);
});

test('deadlines abort stalled headers, stalled body and streaming progress', async () => {
  await assert.rejects(callLunaModel({ ...options, timeoutMs: 15 },
    deps(() => new Promise(() => {}))), /TIMEOUT/);
  await assert.rejects(callLunaModel({ ...options, timeoutMs: 15, onTextDelta() {} },
    deps(async () => new Response(new ReadableStream({ start() {} })))), /TIMEOUT/);
  let interval;
  await assert.rejects(callLunaModel({ ...options, timeoutMs: 100, maxTotalMs: 25, onTextDelta() {} },
    deps(async () => new Response(new ReadableStream({
      start(c) { interval = setInterval(() => c.enqueue(new TextEncoder().encode('data: {"type":"response.in_progress"}\n\n')), 5); },
      cancel() { clearInterval(interval); },
    })))), /TIMEOUT/);
  clearInterval(interval);
});
