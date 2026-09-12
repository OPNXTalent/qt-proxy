import assert from 'node:assert/strict';
import fs from 'node:fs';
import { callInquiryModel } from '../api/interpret.js';

const encoder = new TextEncoder();
const events = [
  { type: 'message_start', message: { id: 'msg_test', usage: { input_tokens: 10 } } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Readable ' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Prism response.' } },
  { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 4 } },
];
const originalFetch = global.fetch;
global.fetch = async () => new Response(new ReadableStream({
  start(controller) {
    for (const event of events) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    controller.close();
  },
}), { status: 200, headers: { 'content-type': 'text/event-stream' } });
const deltas = [];
try {
  const response = await callInquiryModel({
    model: 'claude-sonnet-4-6', maxTokens: 100, prompt: 'test', timeoutMs: 1000,
    onTextDelta: text => deltas.push(text), maxTotalMs: 2000,
  });
  assert.equal(response, 'Readable Prism response.');
  assert.deepEqual(deltas, ['Readable ', 'Prism response.']);
} finally { global.fetch = originalFetch; }
const api = fs.readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
assert.match(api, /onTextDelta: text => sse\.write\(\{ type: 'response_delta', text \}\)/);
assert.match(client, /parsed\.type === 'response_delta'/);
assert.match(client, /renderProvisionalResponse\(fullText, requestId/);
assert.doesNotMatch(api, /onStructuredInputProgress:[\s\S]*provisional_orientation/);
console.log('Reconstructed canonical prose streaming checks passed.');
