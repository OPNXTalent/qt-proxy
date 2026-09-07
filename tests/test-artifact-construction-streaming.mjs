import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { callInquiryModel } from '../api/interpret.js';

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
  const deltas = ['{"orientation":"A real', ' orientation.","canonical_response":"Answer."}'];
  global.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.equal(request.stream, true, 'artifact construction requests Anthropic streaming');
    return new Response(anthropicStream([
      { type: 'message_start', message: { id: 'msg_test', usage: { input_tokens: 12 } } },
      ...deltas.map(text => ({ type: 'content_block_delta', delta: { type: 'text_delta', text } })),
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
  });
  assert.equal(result, deltas.join(''));
  assert.deepEqual(received, deltas, 'provider deltas are forwarded before completion');

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

const api = fs.readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../qt.html', import.meta.url), 'utf8');

assert.match(api, /onTextDelta: delta => \{[\s\S]*?sse\?\.write\(\{ type: 'delta', text: delta, provisional: true \}\);[\s\S]*?\}/);
assert.match(api, /const rawCoreText = await callInquiryModel\([\s\S]*?await completeInterpretationArtifact\(/);
assert.ok(
  api.indexOf('const rawCoreText = await callInquiryModel(') < api.indexOf('await completeInterpretationArtifact('),
  'provisional streaming remains upstream of durable completion and charging',
);
assert.match(client, /extractor\(fullText, 'orientation'\)/);

const scriptBodies = [...client.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(source => source.trim() && !/type=["']module["']/.test(source));
for (const source of scriptBodies) new vm.Script(source);

console.log('artifact construction streaming tests passed');
