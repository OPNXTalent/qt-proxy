import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  callInquiryModel,
  runArtifactConstructionWithRetry,
} from '../api/interpret.js';

const originalFetch = global.fetch;

function anthropicStream(events, intervalMs = 0) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const event of events) {
        if (intervalMs) await new Promise(resolve => setTimeout(resolve, intervalMs));
        controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
      }
      controller.close();
    },
  });
}

try {
  const toolJsonDeltas = ['{"orientation":"A real', ' orientation.","canonical_response":"Answer."}'];
  global.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.equal(request.stream, true, 'forced structured output requests Anthropic streaming');
    assert.equal(request.tool_choice.name, 'emit_interpretation_artifact');
    return new Response(anthropicStream([
      { type: 'message_start', message: { id: 'msg_test', usage: { input_tokens: 12 } } },
      {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'tool_use', id: 'tool_test', name: 'emit_interpretation_artifact', input: {} },
      },
      ...toolJsonDeltas.map(partial_json => ({
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json },
      })),
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 8 } },
      { type: 'message_stop' },
    ], 8), { status: 200, headers: { 'request-id': 'req_test' } });
  };

  const received = [];
  const result = await callInquiryModel({
    model: 'claude-sonnet-4-6',
    maxTokens: 2400,
    prompt: 'dynamic question',
    system: [{ type: 'text', text: 'static framework', cache_control: { type: 'ephemeral' } }],
    timeoutMs: 20,
    maxTotalMs: 200,
    onTextDelta: delta => received.push(delta),
    structuredOutputSchema: { type: 'object' },
    structuredOutputName: 'emit_interpretation_artifact',
  });
  assert.deepEqual(result, {
    orientation: 'A real orientation.',
    canonical_response: 'Answer.',
  });
  assert.deepEqual(received, toolJsonDeltas, 'tool JSON deltas are forwarded before completion');

  const textDeltas = ['plain ', 'stream'];
  global.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.equal(request.stream, true);
    assert.equal(request.tools, undefined, 'plain streaming does not add structured-output tools');
    return new Response(anthropicStream([
      { type: 'message_start', message: { id: 'msg_text', usage: { input_tokens: 4 } } },
      ...textDeltas.map(text => ({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } })),
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 2 } },
      { type: 'message_stop' },
    ], 8), { status: 200 });
  };
  const receivedText = [];
  const textResult = await callInquiryModel({
    model: 'claude-sonnet-4-6',
    maxTokens: 100,
    prompt: 'plain request',
    timeoutMs: 20,
    maxTotalMs: 200,
    onTextDelta: delta => receivedText.push(delta),
  });
  assert.equal(textResult, textDeltas.join(''));
  assert.deepEqual(receivedText, textDeltas, 'plain text deltas remain supported');

  global.fetch = async (_url, options) => new Response(new ReadableStream({
    start(controller) {
      options.signal.addEventListener('abort', () => controller.error(new Error('aborted')), { once: true });
    },
  }), { status: 200 });
  await assert.rejects(
    callInquiryModel({
      model: 'claude-sonnet-4-6',
      maxTokens: 2400,
      prompt: 'dynamic question',
      timeoutMs: 15,
      maxTotalMs: 100,
      onTextDelta() {},
    }),
    /INQUIRY_MODEL_TIMEOUT/,
    'a provider stream with no activity is still bounded',
  );
} finally {
  global.fetch = originalFetch;
}

const retryAttempts = [];
const retryProvisional = [];
let providerAttempt = 0;
try {
  global.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    const retryOrdinal = providerAttempt++;
    retryAttempts.push({ maxTokens: request.max_tokens, retryOrdinal });
    const artifact = retryOrdinal === 0
      ? { orientation: 'First provisional orientation.', canonical_response: 'Truncated.' }
      : { orientation: 'Recovered orientation.', canonical_response: 'Recovered answer.' };
    return new Response(anthropicStream([
      { type: 'message_start', message: { id: `msg_retry_${retryOrdinal}`, usage: { input_tokens: 10 } } },
      {
        type: 'content_block_start', index: 0,
        content_block: { type: 'tool_use', id: `tool_retry_${retryOrdinal}`, name: 'emit_interpretation_artifact', input: {} },
      },
      {
        type: 'content_block_delta', index: 0,
        delta: { type: 'input_json_delta', partial_json: JSON.stringify(artifact) },
      },
      { type: 'content_block_stop', index: 0 },
      {
        type: 'message_delta',
        delta: { stop_reason: retryOrdinal === 0 ? 'max_tokens' : 'end_turn' },
        usage: { output_tokens: retryOrdinal === 0 ? 2400 : 2600 },
      },
      { type: 'message_stop' },
    ]), { status: 200 });
  };
  const recovered = await runArtifactConstructionWithRetry(options => callInquiryModel({
    model: 'claude-sonnet-4-6',
    maxTokens: options.maxTokens,
    prompt: 'same primary query',
    timeoutMs: 75,
    maxTotalMs: 500,
    structuredOutputSchema: { type: 'object' },
    structuredOutputName: 'emit_interpretation_artifact',
    onTextDelta: delta => {
      if (options.forwardProvisional) retryProvisional.push(delta);
    },
    telemetryRetryOrdinal: options.retryOrdinal,
  }));
  assert.deepEqual(recovered, {
    orientation: 'Recovered orientation.',
    canonical_response: 'Recovered answer.',
  });
} finally {
  global.fetch = originalFetch;
}
assert.deepEqual(retryAttempts, [
  { maxTokens: 2400, retryOrdinal: 0 },
  { maxTokens: 3600, retryOrdinal: 1 },
]);
assert.equal(retryProvisional.length, 1, 'the retry does not replay provisional orientation JSON');

let durableCompletionCalls = 0;
await assert.rejects(
  (async () => {
    await runArtifactConstructionWithRetry(async () => {
      throw new Error('INQUIRY_MODEL_OUTPUT_TRUNCATED');
    });
    durableCompletionCalls++;
  })(),
  /INQUIRY_MODEL_OUTPUT_TRUNCATED/,
);
assert.equal(
  durableCompletionCalls,
  0,
  'two truncated attempts cannot reach durable completion or its database charge trigger',
);

const api = fs.readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../qt.html', import.meta.url), 'utf8');

assert.match(api, /onTextDelta: delta => \{[\s\S]*?sse\?\.write\(\{ type: 'delta', text: delta, provisional: true \}\);[\s\S]*?\}/);
assert.match(api, /const rawCoreText = await runArtifactConstructionWithRetry\([\s\S]*?await completeInterpretationArtifact\(/);
assert.ok(
  api.indexOf('const rawCoreText = await runArtifactConstructionWithRetry(') < api.indexOf('await completeInterpretationArtifact('),
  'provisional streaming remains upstream of durable completion and charging',
);
assert.match(client, /extractor\(fullText, 'orientation'\)/);

const scriptBodies = [...client.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(source => source.trim() && !/type=["']module["']/.test(source));
for (const source of scriptBodies) new vm.Script(source);

console.log('artifact construction streaming tests passed');
