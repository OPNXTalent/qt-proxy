import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runProgressiveAnalysisAuditWithRetry } from '../api/interpret.js';

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

console.log('progressive analysis audit retry tests passed');
