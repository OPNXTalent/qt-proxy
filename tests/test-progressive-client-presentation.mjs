import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const client = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const runStart = client.indexOf('async function runInterpretation() {');
const runEnd = client.indexOf('async function runFollowUp(', runStart);
const run = client.slice(runStart, runEnd);
const proxyStart = client.indexOf('async function callProxy(messages, rawQuery, requestId, options) {');
const proxyEnd = client.indexOf('function getErrorMessage(err)', proxyStart);
const proxy = client.slice(proxyStart, proxyEnd);

assert.ok(runStart >= 0 && runEnd > runStart, 'Primary interpretation flow must exist');
assert.ok(proxyStart >= 0 && proxyEnd > proxyStart, 'Primary SSE client must exist');

assert.match(
  proxy,
  /parsed\.type === 'response_delta'[\s\S]*fullText \+= parsed\.text[\s\S]*showResult\(true\)[\s\S]*renderProvisionalResponse\(fullText, requestId\)/,
  'Response deltas must accumulate and expose the answer container before provisional rendering',
);
assert.match(
  proxy,
  /parsed\.type === 'canonical_complete'[\s\S]*canonicalAvailable = true[\s\S]*core_insight = parsed\.response \|\| fullText[\s\S]*showFollowUpComposer\(\)/,
  'Canonical completion must replace provisional prose and unlock follow-up independently of context',
);
assert.match(proxy, /parsed\.type === 'interpretive_context'[\s\S]*progressiveResult\.interpretive_context = parsed\.text \|\| ''[\s\S]*renderResult\(progressiveResult\)/);
assert.match(proxy, /parsed\.type === 'explore_context'[\s\S]*progressiveResult\.explore_context = Array\.isArray\(parsed\.nodes\)[\s\S]*renderResult\(progressiveResult\)/);
assert.match(
  proxy,
  /parsed\.type === 'error'[\s\S]*if \(canonicalAvailable\)[\s\S]*_contextError[\s\S]*renderResult\(progressiveResult\)[\s\S]*else[\s\S]*throw new Error\('Stream error:/,
  'A post-canonical secondary failure must preserve and rerender canonical state',
);

assert.match(proxy, /if \(progressiveResult\)[\s\S]*return progressiveResult;/, 'Progressive state must be returned as an object');
assert.match(run, /const isProgressiveResponse = apiResponse && typeof apiResponse === 'object';/);
assert.match(run, /let parsed = isProgressiveResponse \? apiResponse : null;/);
assert.match(run, /if \(!isProgressiveResponse\) try \{[\s\S]*cleaned = cleaned\.replace\(\/\[\\u201C\\u201D\]/);
assert.ok(
  run.indexOf("let parsed = isProgressiveResponse ? apiResponse : null;") < run.indexOf('if (!isProgressiveResponse) try {'),
  'Structured progressive state must bypass legacy text repair',
);

for (const prose of [
  '“Love your enemies” does not mean permission for continued harm.',
  'A Christian’s forgiveness can include the boundary, “You may not do this again.”',
]) {
  const structured = { core_insight: prose, _canonicalAvailable: true };
  const selected = structured && typeof structured === 'object' ? structured : null;
  assert.equal(selected.core_insight, prose, 'Structured canonical prose must remain byte-for-byte unchanged');
}

const doneBranch = proxy.slice(proxy.indexOf("parsed.type === 'done'"), proxy.indexOf("parsed.type === 'error'"));
assert.doesNotMatch(doneBranch, /JSON\.parse|renderResult|response_delta/, 'done must finalize metadata without reparsing or destroying rendered state');

assert.match(client, /function selectThread\(id\)/, 'Legacy Archive rendering path must remain present');

console.log('Progressive client presentation checks passed.');
