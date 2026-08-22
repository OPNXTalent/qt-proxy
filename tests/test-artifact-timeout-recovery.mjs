import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const repair = fs.readFileSync(new URL('../scripts/runtime-archive-repair.mjs', import.meta.url), 'utf8');

test('initial artifact timeout and truncation share one bounded structured recovery path', () => {
  assert.match(repair, /recoveryCode === 'INQUIRY_MODEL_OUTPUT_TRUNCATED'/);
  assert.match(repair, /recoveryCode === 'INQUIRY_MODEL_TIMEOUT'/);
  assert.match(repair, /if \(!isTruncation && !isTimeout\) throw error;/);
  assert.match(repair, /isTimeout \? 'timeout_retry' : 'truncation_retry'/);
  assert.match(repair, /isTimeout \? 'artifact_timeout_retry_start' : 'artifact_truncation_retry_start'/);
  assert.match(repair, /maxTokens: 3600/);
  assert.match(repair, /timeoutMs: 90000/);
  assert.match(repair, /structuredOutputSchema: PRISM_ARTIFACT_CORE_SCHEMA/);
  assert.match(repair, /structuredOutputName: 'emit_interpretation_artifact'/);
});

test('artifact timeout recovery remains bounded to a single retry before normal failure propagation', () => {
  const retryCalls = repair.match(/rawCore = await callInquiryModel\(\{/g) || [];
  assert.equal(retryCalls.length, 1, 'runtime repair should introduce exactly one recovery model call');
});

console.log('artifact timeout recovery contract tests passed');