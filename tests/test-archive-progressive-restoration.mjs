import assert from 'node:assert/strict';
import fs from 'node:fs';

const { responseFromArtifact } = await import('../api/threads.js');

const client = fs.readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const threadsApi = fs.readFileSync(new URL('../api/threads.js', import.meta.url), 'utf8');

// Authenticated Archive hydration must not reuse a pre-enrichment response.
assert.match(threadsApi, /setHeader\('Cache-Control', 'private, no-store'\)/);
assert.match(
  client,
  /authenticatedFetch\(API_BASE \+ '\/api\/threads', \{\s*cache: 'no-store',\s*headers: \{ 'Content-Type': 'application\/json', 'x-user-email': email \}/,
  'The registered Archive fetch must bypass browser response caching',
);

// A canonical-only browser snapshot can exist before enrichment attachment.
// Reopening Archive must prefer the server-reconstructed artifact revision.
assert.match(
  client,
  /var responseData = archiveResponseForRender\(supaResp, localParsed\);/,
  'Archive restoration must prefer the server-authoritative response over a stale local snapshot',
);

// The server reconstruction must retain both completed revision-1 packet types
// and map their persisted camelCase content into the legacy renderer contract.
assert.match(threadsApi, /artifact_revision=eq\.1&status=eq\.complete/);
assert.match(threadsApi, /packet\.packet_type === 'interpretive_context'/);
assert.match(threadsApi, /response\.interpretive_context = content\.text \|\| ''/);
assert.match(threadsApi, /packet\.packet_type === 'prism_analysis'/);
assert.match(threadsApi, /response\.prism_analysis = content/);
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

// Functional reconstruction: packet identity and the existing flattened
// renderer contract must coexist in the serialized response object.
const artifactId = '12d53b63-f393-4ee1-a823-76d50310d3cf';
const restored = responseFromArtifact({
  artifact_id: artifactId,
  artifact_revision: 1,
  artifact: {
    artifactId,
    revision: 1,
    responseMode: 'reflective',
    orientation: 'Orientation',
    canonicalResponse: 'Canonical response',
    openDoorQuestion: 'Open door?',
  },
}, [
  { packet_type: 'interpretive_context', content: { text: 'Persisted context' } },
  {
    packet_type: 'prism_analysis',
    content: {
      framework: {
        prismSummary: 'Summary',
        entanglement: 'Entanglement',
        coherenceAlignment: 'Coherence',
        noiseDecoherence: 'Noise',
        telosInsight: 'Telos',
        olamHaba: 'Olam HaBa',
      },
      keyTerms: [{ term: 'Tov', original: 'טוֹב', meaning: 'Fit for use' }],
      constraintFindings: [],
      futureAnalysisProjections: [],
    },
  },
]);

assert.equal(restored._artifactId, artifactId);
assert.equal(restored._artifactRevision, 1);
assert.equal(restored.interpretive_context, 'Persisted context');
assert.equal(restored.prism_analysis.framework.prismSummary, 'Summary');
assert.equal(restored.prism_summary, 'Summary');
assert.equal(restored.entanglement, 'Entanglement');
assert.equal(restored.key_terms[0].term, 'Tov');
assert.notEqual(restored._analysisIncomplete, true);

const legacyEmpty = responseFromArtifact({
  artifact_id: artifactId,
  artifact_revision: 1,
  artifact: {
    artifactId,
    revision: 1,
    responseMode: 'reflective',
    orientation: 'Orientation',
    canonicalResponse: 'Canonical response',
    openDoorQuestion: 'Open door?',
  },
}, [
  { packet_type: 'interpretive_context', content: { text: '' } },
  {
    packet_type: 'prism_analysis',
    content: {
      framework: {
        prismSummary: '',
        entanglement: '',
        coherenceAlignment: '',
        noiseDecoherence: '',
        telosInsight: '',
        olamHaba: '',
      },
      keyTerms: [],
      constraintFindings: [],
      futureAnalysisProjections: [],
    },
  },
]);
assert.equal(legacyEmpty._artifactId, artifactId);
assert.equal(legacyEmpty._artifactRevision, 1);
assert.equal(legacyEmpty.core_insight, 'Canonical response');
assert.equal(legacyEmpty._analysisIncomplete, true);

// Client transfer remains server-first and re-applies the preserved analysis
// packet to the same object before the existing renderer receives it.
const archiveTransferStart = client.indexOf('function archiveResponseForRender(');
const archiveTransferEnd = client.indexOf('\nfunction ', archiveTransferStart + 1);
assert.ok(archiveTransferStart >= 0 && archiveTransferEnd > archiveTransferStart);
const archiveTransferSource = client.slice(archiveTransferStart, archiveTransferEnd);
assert.match(archiveTransferSource, /var responseData = serverResponse \|\| localResponse/);
assert.match(archiveTransferSource, /packetType: 'prism_analysis'/);
assert.match(archiveTransferSource, /artifactId: responseData\._artifactId/);
assert.match(archiveTransferSource, /artifactRevision: responseData\._artifactRevision/);

// Replaying legacy empty analysis must preserve the server-authoritative
// incomplete state. Only substantive enrichment may clear that state.
const packetApplyStart = client.indexOf('function applyProgressivePacket(');
const packetApplyEnd = client.indexOf('\nfunction ', packetApplyStart + 1);
assert.ok(packetApplyStart >= 0 && packetApplyEnd > packetApplyStart);
const packetApplySource = client.slice(packetApplyStart, packetApplyEnd);
assert.match(packetApplySource, /var hasSubstantiveAnalysis = progressiveAnalysisHasSubstance\(content\)/);
assert.match(packetApplySource, /if \(hasSubstantiveAnalysis\) result\._analysisIncomplete = false/);
assert.doesNotMatch(packetApplySource, /\n\s*result\._analysisIncomplete = false/);

// The temporary Preview diagnostic compares the raw Archive payload with the
// exact object handed to renderResult without exposing response content.
assert.match(client, /\[prism:archive-client-boundary\]/);
assert.match(client, /console\.info\('\[prism:archive-client-boundary\] ' \+ JSON\.stringify\(\{/);
assert.match(client, /rawApiThreads: _archiveRawResponseDiagnostics\.get\(id\)/);
assert.match(client, /beforeRenderResult: archiveDiagnosticShape\(responseData\)/);
assert.match(client, /topLevelKeys: keys/);
assert.match(client, /hasInterpretiveContext: keys\.indexOf\('interpretive_context'\) !== -1/);
assert.match(client, /hasPrismAnalysis: keys\.indexOf\('prism_analysis'\) !== -1/);
assert.match(client, /hasFlattenedCompatibilityFields: flattenedFields\.some/);
assert.match(client, /interpretiveContextShape: archiveDiagnosticValueShape/);
assert.match(client, /prismAnalysisFrameworkKeys: expectedNestedKeys\.reduce/);
assert.match(client, /flattenedValueShape: flattenedValueShape/);
assert.match(client, /keyTermsCardinality: Array\.isArray\(keyTerms\) \? keyTerms\.length : 0/);
assert.match(client, /computedHasFramework: computedHasFramework/);
assert.match(client, /computedHasInterpretiveContext: !!\(value && value\.interpretive_context\)/);
assert.match(client, /analysisPending: !!\(value && value\._analysisPending\)/);
assert.match(client, /analysisIncomplete: !!\(value && value\._analysisIncomplete\)/);
assert.doesNotMatch(
  client.slice(client.indexOf('function archiveDiagnosticShape('), client.indexOf('\nfunction ', client.indexOf('function archiveDiagnosticShape(') + 1)),
  /core_insight|recognition|open_door_question|canonicalResponse|userInput/,
  'Archive boundary diagnostic must not inspect or log user/model content',
);

console.log('Archive progressive packet restoration regression passed.');
