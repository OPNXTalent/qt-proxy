import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const interpret = readFileSync('api/interpret.js', 'utf8');
const qt = readFileSync('qt.html', 'utf8');

assert.match(
  interpret,
  /A substantive generated Framework is already valid Prism Analysis/,
  'validated generated Framework should remain usable when the secondary audit fails',
);
assert.match(
  interpret,
  /progressive_analysis_audit_degraded/,
  'audit failure should be recorded as degraded instead of making the Framework incomplete',
);
assert.match(
  interpret,
  /fallback:\s*'validated_generated_enrichment'/,
  'audit degradation should explicitly fall back to generated enrichment',
);
assert.match(
  interpret,
  /structuredOutputName:\s*'emit_audited_enrichment'/,
  'Framework audit should use structured output',
);
assert.match(
  interpret,
  /maxTokens:\s*3600[\s\S]*?timeoutMs:\s*20000/,
  'Framework audit should have enough output room but remain time-bounded',
);

assert.match(
  qt,
  /d\._analysisPending\s*\|\|\s*d\._analysisIncomplete/,
  'Framework shell should remain present while analysis is incomplete',
);
assert.match(
  qt,
  /Prism Analysis paused\./,
  'incomplete Framework should explain its recoverable state inside the Framework shell',
);
assert.match(
  qt,
  /onclick=\"retryProgressiveAnalysis\(this\)\"/,
  'Framework retry control should remain wired to the recovery endpoint',
);

console.log('Progressive Framework resilience regression passed.');
