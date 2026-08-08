import assert from 'node:assert/strict';
import fs from 'node:fs';

const client = fs.readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const threadsApi = fs.readFileSync(new URL('../api/threads.js', import.meta.url), 'utf8');

// A canonical-only browser snapshot can exist before enrichment attachment.
// Reopening Archive must prefer the server-reconstructed artifact revision.
assert.match(
  client,
  /var responseData = supaResp \|\| localParsed;/,
  'Archive restoration must prefer the server-authoritative response over a stale local snapshot',
);

// The server reconstruction must retain both completed revision-1 packet types
// and map their persisted camelCase content into the legacy renderer contract.
assert.match(threadsApi, /artifact_revision=eq\.1&status=eq\.complete/);
assert.match(threadsApi, /packet\.packet_type === 'interpretive_context'/);
assert.match(threadsApi, /response\.interpretive_context = content\.text \|\| ''/);
assert.match(threadsApi, /packet\.packet_type === 'prism_analysis'/);
assert.match(threadsApi, /response\.prism_summary = framework\.prismSummary \|\| ''/);
assert.match(threadsApi, /response\.key_terms = \(content\.keyTerms \|\| \[\]\)/);
assert.match(threadsApi, /_artifactId: artifact\.artifactId/);
assert.match(threadsApi, /_artifactRevision: artifact\.revision/);

// Restoration remains a read-only render path: selecting an archived thread
// renders the hydrated response and does not invoke interpretation or charging.
const selectStart = client.indexOf('function selectThread(');
const selectEnd = client.indexOf('\nfunction ', selectStart + 1);
assert.ok(selectStart >= 0 && selectEnd > selectStart, 'selectThread function must exist');
const selectThreadSource = client.slice(selectStart, selectEnd);
assert.match(selectThreadSource, /renderResult\(responseData\)/);
assert.doesNotMatch(selectThreadSource, /\/api\/interpret|charge|complete_inquiry_artifact/);

// The existing renderer exposes Framework when restored analysis is present and
// renders Interpretive Context from the same reconstructed response object.
assert.match(client, /const hasFramework = sections\.some/);
assert.match(client, /if \(d\.interpretive_context\)/);
assert.match(client, /Framework for Interpretation/);

console.log('Archive progressive packet restoration regression passed.');
