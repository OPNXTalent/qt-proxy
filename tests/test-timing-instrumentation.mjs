import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const interpretSource = readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const qtSource = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');

const serverEvents = [
  'request_start',
  'request_body_parsed',
  'safety_complete',
  'access_complete',
  'rag_start',
  'embedding_start',
  'embedding_end',
  'rag_rpc_start',
  'rag_rpc_end',
  'rag_complete',
  'prompt_assembly_complete',
  'canonical_generation_start',
  'canonical_generation_complete',
  'canonical_audit_start',
  'canonical_audit_complete',
  'canonical_completion_start',
  'canonical_completion_complete',
  'canonical_response_available',
  'context_companion_start',
  'context_companion_complete',
  'done_sent',
  'response_closed',
];

for (const event of serverEvents) {
  assert.ok(interpretSource.includes(`'${event}'`), `Missing server timing event: ${event}`);
}

const browserEvents = [
  'submit',
  'wait_indicator_visible',
  'response_headers_received',
  'first_delta_received',
  'first_response_text_visible',
  'canonical_completion_available',
  'interpretive_context_visible',
  'explore_context_visible',
  'structured_result_visible',
];

for (const event of browserEvents) {
  assert.ok(qtSource.includes(`'${event}'`), `Missing browser timing event: ${event}`);
}

assert.match(
  interpretSource,
  /res\.setHeader\('X-Prism-Request-Id', requestId\)/,
  'Server must echo the shared request ID',
);

const requestIdPayloadCount = (qtSource.match(/\brequestId\s*\n?\s*}\)/g) || []).length;
assert.ok(requestIdPayloadCount >= 2, 'Both browser API paths must send the request ID');

assert.ok(
  !interpretSource.includes("timing('request_start', { query:"),
  'Timing records must not include query text',
);
assert.ok(
  !interpretSource.includes("timing('request_complete', { response:"),
  'Timing records must not include response text',
);
assert.ok(
  !qtSource.includes("markPrismBrowserTiming(requestId, 'submit', { query:"),
  'Browser timing records must not include query text',
);

console.log('Timing instrumentation contract checks passed.');
