import assert from 'node:assert/strict';
import fs from 'node:fs';
const api = fs.readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const initial = api.slice(api.indexOf('async function runProgressiveInitialInquiry'), api.indexOf('async function runPersistentInquiryFollowUp'));
for (const event of ['response_delta', 'canonical_complete', 'done']) {
  assert.ok(api.includes(`type: '${event}'`), `server emits ${event}`);
  assert.ok(client.includes(`parsed.type === '${event}'`) || event === 'done', `client consumes ${event}`);
}
assert.ok(initial.indexOf('completeInterpretationArtifact') < initial.indexOf("type: 'canonical_complete'"));
assert.doesNotMatch(initial, /generateAndAttachContext|context_companion|emit_context_companion/);
assert.doesNotMatch(initial, /PRISM_ENRICHMENT_SCHEMA|generateAndAttachEnrichment|constructAuditedArtifact/);
assert.match(api, /charge: false/);
assert.match(api, /createCompletionKey/);
console.log('Reconstructed runtime constitution conformance checks passed.');
