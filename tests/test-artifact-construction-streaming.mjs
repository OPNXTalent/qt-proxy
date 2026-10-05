import assert from 'node:assert/strict';
import fs from 'node:fs';
import { callInquiryModel } from '../api/interpret.js';

const encoder = new TextEncoder();
const events = [
  { type: 'response.output_text.delta', delta: 'Readable ' },
  { type: 'response.output_text.delta', delta: 'Prism response.' },
  { type: 'response.completed', response: { id: 'resp_test', status: 'completed',
    output: [{ type: 'message', content: [{ type: 'output_text', text: 'Readable Prism response.' }] }],
    usage: { input_tokens: 10, output_tokens: 4 } } },
];
const originalFetch = global.fetch;
const originalKey = process.env.OPENAI_API_KEY;
process.env.OPENAI_API_KEY = 'offline-test-key';
global.fetch = async () => new Response(new ReadableStream({
  start(controller) {
    for (const event of events) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    controller.close();
  },
}), { status: 200, headers: { 'content-type': 'text/event-stream' } });
const deltas = [];
try {
  const response = await callInquiryModel({
    model: 'gpt-6-luna', maxTokens: 100, prompt: 'test', timeoutMs: 1000,
    onTextDelta: text => deltas.push(text), maxTotalMs: 2000,
  });
  assert.equal(response, 'Readable Prism response.');
  assert.deepEqual(deltas, ['Readable ', 'Prism response.']);
} finally {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
}
const api = fs.readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
assert.match(api, /onTextDelta: text => sse\.write\(\{ type: 'response_delta', text \}\)/);
const initialInquiry = api.slice(
  api.indexOf('async function runProgressiveInitialInquiry'),
  api.indexOf('async function runPersistentInquiryFollowUp'),
);
assert.match(initialInquiry, /collapseRepeatedTerminalParagraphs\(streamedResponse\)/);
assert.match(initialInquiry, /response: canonicalResponse/);
assert.doesNotMatch(initialInquiry, /auditCanonicalResponse|canonical_audit/);
assert.match(client, /parsed\.type === 'response_delta'/);
assert.match(client, /renderProvisionalResponse\(fullText, requestId/);
assert.doesNotMatch(api, /onStructuredInputProgress:[\s\S]*provisional_orientation/);
console.log('Reconstructed canonical prose streaming checks passed.');
