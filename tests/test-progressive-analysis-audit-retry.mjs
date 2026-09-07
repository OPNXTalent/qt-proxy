import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  runProgressiveAnalysisAuditWithRetry,
  runProgressiveAnalysisGenerationWithRetry,
} from '../api/interpret.js';

const generationAttempts = [];
const generated = await runProgressiveAnalysisGenerationWithRetry(async options => {
  generationAttempts.push(options);
  if (options.retryOrdinal === 0) throw new Error('INQUIRY_MODEL_OUTPUT_TRUNCATED');
  return { interpretive_context: 'Substantive context' };
});
assert.deepEqual(generationAttempts, [
  { maxTokens: 3000, retryOrdinal: 0 },
  { maxTokens: 4500, retryOrdinal: 1 },
]);
assert.deepEqual(generated, { interpretive_context: 'Substantive context' });

let generationValidationFailures = 0;
await assert.rejects(
  runProgressiveAnalysisGenerationWithRetry(async () => {
    generationValidationFailures++;
    throw new Error('ENRICHMENT_EMPTY');
  }),
  /ENRICHMENT_EMPTY/,
);
assert.equal(generationValidationFailures, 1, 'non-truncation generation failures are not retried');

let exhaustedGenerationAttempts = 0;
await assert.rejects(
  runProgressiveAnalysisGenerationWithRetry(async () => {
    exhaustedGenerationAttempts++;
    throw new Error('INQUIRY_MODEL_OUTPUT_TRUNCATED');
  }),
  /INQUIRY_MODEL_OUTPUT_TRUNCATED/,
);
assert.equal(exhaustedGenerationAttempts, 2, 'generation truncation retries exactly once');

const attempts = [];
const recovered = await runProgressiveAnalysisAuditWithRetry(async options => {
  attempts.push(options);
  if (options.retryOrdinal === 0) throw new Error('INQUIRY_MODEL_OUTPUT_TRUNCATED');
  return '{"interpretive_context":"Substantive context"}';
});
assert.deepEqual(attempts, [
  { maxTokens: 1800, retryOrdinal: 0 },
  { maxTokens: 3000, retryOrdinal: 1 },
]);
assert.deepEqual(recovered, {
  value: '{"interpretive_context":"Substantive context"}',
  retried: true,
});

let nonTruncationAttempts = 0;
await assert.rejects(
  runProgressiveAnalysisAuditWithRetry(async () => {
    nonTruncationAttempts++;
    throw new Error('INQUIRY_MODEL_TIMEOUT');
  }),
  /INQUIRY_MODEL_TIMEOUT/,
);
assert.equal(nonTruncationAttempts, 1, 'only truncation permits the bounded audit retry');

let exhaustedAttempts = 0;
await assert.rejects(
  runProgressiveAnalysisAuditWithRetry(async () => {
    exhaustedAttempts++;
    throw new Error('INQUIRY_MODEL_OUTPUT_TRUNCATED');
  }),
  /INQUIRY_MODEL_OUTPUT_TRUNCATED/,
);
assert.equal(exhaustedAttempts, 2, 'the audit retry is attempted exactly once');

const api = fs.readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const generation = api.indexOf("telemetryStage: 'progressive_analysis_generation'");
const auditRetry = api.indexOf('runProgressiveAnalysisAuditWithRetry(', generation);
const packetConstruction = api.indexOf('createEnrichmentPackets(artifact, enrichment)', auditRetry);
assert.ok(generation >= 0 && auditRetry > generation && packetConstruction > auditRetry,
  'the same generated analysis is audited with bounded recovery before packet attachment');
assert.match(api, /if \(auditResult\.retried\) throw new Error\('ENRICHMENT_AUDIT_EMPTY'\)/,
  'a truncation retry that remains empty fails closed instead of adding another audit attempt');
assert.match(api, /runProgressiveAnalysisGenerationWithRetry\([\s\S]*?structuredOutputSchema: PRISM_ENRICHMENT_SCHEMA,[\s\S]*?structuredOutputName: 'emit_prism_enrichment'/,
  'Sonnet enrichment generation uses the existing forced structured schema');
assert.match(api, /const durablePacket = await attachInterpretationPacket\(packet,[\s\S]*?sse\.write\(\{ type: 'packet', packet: durablePacket \}\)/,
  'enrichment packets are emitted only after durable attachment');
assert.match(api, /status: 'incomplete',[\s\S]*?artifactId: artifact\.artifactId,[\s\S]*?artifactRevision: artifact\.revision/,
  'exhausted enrichment recovery identifies the artifact in the explicit incomplete state');
const initialPipeline = api.slice(api.indexOf('async function runProgressiveInitialInquiry'), api.indexOf('async function runPersistentInquiryFollowUp'));
assert.ok(
  initialPipeline.indexOf("type: 'canonical_complete'") < initialPipeline.indexOf('await generateAndAttachEnrichment('),
  'canonical completion remains available before enrichment begins',
);
const enrichmentPipeline = api.slice(api.indexOf('async function generateAndAttachEnrichment'), api.indexOf('async function runProgressiveInitialInquiry'));
assert.doesNotMatch(enrichmentPipeline, /completeInterpretationArtifact|preparePrismInquiry|consumePrismQuery/,
  'enrichment generation and audit retries cannot consume customer entitlement');

console.log('progressive analysis generation and audit retry tests passed');
