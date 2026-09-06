import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');

const helper = api.match(
  /function cachedArtifactConstructionSystem\(systemPrompt\) \{[\s\S]*?\n\}/,
)?.[0] || '';

assert.ok(helper, 'artifact construction must define an explicit cache boundary');
assert.match(
  helper,
  /progressiveSystemPrompt\(PRISM_SYSTEM_PROMPT, PRISM_ARTIFACT_CORE_CONTRACT\)/,
  'the invariant Prism framework and artifact contract must form the cached prefix',
);
assert.match(
  helper,
  /cache_control:\s*\{\s*type:\s*'ephemeral'\s*\}/,
  'the static prefix must use Anthropic ephemeral prompt caching',
);
assert.match(
  helper,
  /source\.slice\(PRISM_SYSTEM_PROMPT\.length\)/,
  'request-specific system material must be separated from the static prefix',
);
assert.match(
  helper,
  /if \(!source\.startsWith\(PRISM_SYSTEM_PROMPT\)\)[\s\S]*?progressiveSystemPrompt\(source, PRISM_ARTIFACT_CORE_CONTRACT\)/,
  'nonstandard callers must preserve their prior prompt semantics without caching an unstable prefix',
);
assert.match(
  helper,
  /dynamicSuffix \? \[\{ type: 'text', text: dynamicSuffix \}\] : \[\]/,
  'dynamic system material must remain uncached after the cache breakpoint',
);

const artifactCall = api.match(
  /const rawCoreText = await callInquiryModel\(\{[\s\S]*?prompt: query,[\s\S]*?\n\s*\}\);/,
)?.[0] || '';

assert.match(artifactCall, /model: 'claude-sonnet-4-6'/);
assert.match(artifactCall, /maxTokens: 2400/);
assert.match(artifactCall, /timeoutMs: 75000/);
assert.match(artifactCall, /system: cachedArtifactConstructionSystem\(systemPrompt\)/);
assert.match(artifactCall, /prompt: query/);
assert.doesNotMatch(
  artifactCall,
  /cache_control/,
  'the dynamic user query must not carry a cache breakpoint',
);

console.log('artifact prompt caching tests passed');
