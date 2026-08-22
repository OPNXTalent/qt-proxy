import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHmac } from 'node:crypto';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-test-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-key';
process.env.OPENAI_API_KEY = 'openai-test-key';
process.env.ANTHROPIC_API_KEY = 'anthropic-test-key';
process.env.PERSISTENT_INQUIRY_RUNTIME_ENABLED = 'true';

let auditCompleted = false;
let modelCallCount = 0;
const committedBodies = [];
let canonicalState = null;
let canonicalVersion = 0;
let auditMode = 'valid';
let commitMode = 'valid';
let activeRequest = null;
let allowKillSwitchDelta = false;

globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  if (target.includes('/query_log') && (!options.method || options.method === 'GET')) {
    return Response.json([]);
  }
  if (target.includes('/query_log') && options.method === 'POST') {
    return new Response('', { status: 201 });
  }
  if (target.includes('/inquiry_states?')) {
    if (!target.includes(encodeURIComponent('anon:integration-test-12345'))) {
      return Response.json([]);
    }
    return Response.json(canonicalState
      ? [{ version: canonicalVersion, state: canonicalState }]
      : []);
  }
  if (target.includes('/v1/embeddings')) {
    return Response.json({ data: [{ embedding: [0.1, 0.2, 0.3] }] });
  }
  if (target.includes('/rpc/match_corpus')) return Response.json([]);
  if (target.includes('/rpc/commit_inquiry_state')) {
    if (commitMode === 'unavailable') {
      return Response.json({ error: 'storage unavailable' }, { status: 503 });
    }
    const committedBody = JSON.parse(options.body);
    committedBodies.push(committedBody);
    if (committedBody.p_expected_version !== canonicalVersion) {
      return Response.json([{
        committed: false,
        current_version: canonicalVersion,
        current_state: canonicalState,
      }]);
    }
    canonicalVersion += 1;
    canonicalState = { ...committedBody.p_state, version: canonicalVersion };
    return Response.json([{
      committed: true,
      current_version: canonicalVersion,
      current_state: canonicalState,
    }]);
  }
  if (target.includes('/rpc/complete_followup_interpretation_artifact')) {
    if (commitMode === 'unavailable') {
      return Response.json({ error: 'storage unavailable' }, { status: 503 });
    }
    const body = JSON.parse(options.body);
    committedBodies.push({
      p_expected_version: body.p_expected_state_version,
      p_state: body.p_inquiry_state,
    });
    if (body.p_expected_state_version !== canonicalVersion) {
      return Response.json([{
        completed: false,
        conflict: true,
        state_version: canonicalVersion,
        canonical_state: canonicalState,
      }]);
    }
    canonicalVersion += 1;
    canonicalState = { ...body.p_inquiry_state, version: canonicalVersion };
    return Response.json([{
      completed: true,
      conflict: false,
      state_version: canonicalVersion,
      canonical_state: canonicalState,
    }]);
  }
  if (target.includes('/rpc/attach_interpretation_packet')) return Response.json(true);
  if (target.includes('api.anthropic.com')) {
    modelCallCount += 1;
    const body = JSON.parse(options.body);
    const prompt = body.messages[0].content;
    if (prompt.includes('proposition reducer')) {
      return Response.json({
        content: [{ type: 'text', text: JSON.stringify({
          reduction: {
            primaryProposition: 'Agency has not been located outside prior causes.',
            supportingPropositions: [],
            rhetoricalLanguage: [],
            emotionalLanguage: [],
            examples: [],
            narrative: null,
          },
          structuralDelta: 'The inquiry moved from responsibility to agency.',
          constraintGate: {
            observations: ['No independent agency was identified.'],
            inferences: ['Agency therefore does not exist.'],
            evidenceBoundaries: ['Non-identification is not proof of absence.'],
            unsupportedAssumptions: [],
            unfalsifiableClaims: [],
            activeAssumptions: ['Causal dependence may entail determination.'],
            logicalClosure: 'open',
            falsifiabilityStatus: 'partially_testable',
            relevantConstraints: ['ontological', 'logical'],
            retrieval: { needed: true, focus: 'agency and causal dependence' },
            questionNeeded: false,
            endingMode: 'declarative',
            draftPreparation: 'Test the inference directly.',
          },
          changedStateFields: ['orientation', 'unresolvedClaims'],
          statePatch: {
            orientation: 'Where agency enters a conditioned process',
            unresolvedClaims: ['Whether causal dependence entails determination'],
            trajectoryChange: 'Responsibility became an ontological agency question.',
          },
        }) }],
      });
    }
    if (prompt.includes('precision epistemic editor')) {
      auditCompleted = true;
      if (auditMode === 'provider_error') {
        return Response.json({ error: 'provider unavailable' }, { status: 503 });
      }
      if (auditMode === 'timeout') {
        throw new DOMException('The audit timed out', 'AbortError');
      }
      if (auditMode === 'malformed') {
        return Response.json({ content: [{ type: 'text', text: '' }] });
      }
      if (auditMode === 'invalid') {
        return Response.json({ content: [{ type: 'text', text: 'AUDIT: rejected' }] });
      }
      if (auditMode === 'interrupted') {
        activeRequest?.emit('aborted');
      }
      return Response.json({
        content: [{
          type: 'text',
          text: 'Not locating agency independently of prior causes does not establish that agency is absent. It establishes the present boundary of the argument.',
        }],
      });
    }
    if (body.system?.includes('Generate inspectable enrichment')) {
      return Response.json({
        content: [{ type: 'text', text: JSON.stringify({
          interpretive_context: 'The argument concerns causal dependence and agency.',
          framework: { noise_decoherence: 'Non-identification was promoted to proof of absence.' },
          key_terms: [],
          constraint_findings: ['The conclusion exceeds the stated observation.'],
          future_analysis_projections: [],
        }) }],
      });
    }
    if (prompt.includes('Audit this enrichment')) {
      const source = prompt.slice(prompt.indexOf('Enrichment:') + 'Enrichment:'.length);
      return Response.json({ content: [{ type: 'text', text: source.trim() }] });
    }
    return Response.json({
      content: [{
        type: 'text',
        text: 'A draft that must remain hidden until its constraint audit completes.',
      }],
    });
  }
  throw new Error(`Unexpected fetch: ${target}`);
};

const {
  classifyFollowUpContext,
  default: handler,
  verifyPendingInquiryCommit,
  persistentInquiryRuntimeEnabled,
} = await import('../api/interpret.js');

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.headers = new Map();
    this.statusCode = 200;
    this.headersSent = false;
    this.destroyed = false;
    this.writableEnded = false;
    this.output = '';
  }
  setHeader(name, value) { this.headers.set(name.toLowerCase(), String(value)); }
  status(code) { this.statusCode = code; return this; }
  write(value) {
    this.headersSent = true;
    const line = String(value);
    if (line.includes('"type":"delta"')) {
      assert.equal(
        auditCompleted || allowKillSwitchDelta,
        true,
        'Unaudited prose reached the response stream',
      );
    }
    this.output += line;
    return true;
  }
  end() { this.writableEnded = true; return this; }
  json(value) {
    this.headersSent = true;
    this.output = JSON.stringify(value);
    this.end();
    return this;
  }
}

async function executeFollowUp(requestId, query) {
  auditCompleted = false;
  const req = new EventEmitter();
  activeRequest = req;
  req.method = 'POST';
  req.url = '/api/interpret';
  req.headers = { host: 'localhost', 'x-forwarded-for': '127.0.0.1' };
  req.socket = { remoteAddress: '127.0.0.1' };
  req.body = {
    messages: [{ role: 'user', content: query }],
    rawQuery: query,
    isFollowUp: true,
    inquiryKey: 'anon:integration-test-12345',
    inquiryToken: createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY)
      .update('prism-inquiry:anon:integration-test-12345')
      .digest('base64url'),
    inquirySubject: 'Whether responsibility survives prior causes',
    requestId,
  };
  const res = new MockResponse();
  await handler(req, res);
  activeRequest = null;
  return res;
}

function streamEvents(response) {
  return response.output
    .split('\n')
    .filter(line => line.startsWith('data: '))
    .map(line => JSON.parse(line.slice(6)));
}

const res = await executeFollowUp('integration_123', 'Where exactly does agency enter?');

assert.equal(res.statusCode, 200);
assert.equal(res.writableEnded, true);
assert.equal(modelCallCount, 5, 'Expected reducer, draft, canonical audit, enrichment, and packet audit');
assert.equal(committedBodies.length, 1, 'Canonical state was not durably completed before delivery');
assert.equal(committedBodies[0].p_expected_version, 0);
assert.equal(committedBodies[0].p_state.turn, 1);
assert.equal(committedBodies[0].p_state.inquiryTrajectory.length, 1);

const events = res.output
  .split('\n')
  .filter(line => line.startsWith('data: '))
  .map(line => JSON.parse(line.slice(6)));
const stages = events.filter(event => event.type === 'stage').map(event => event.stage);
assert.deepEqual(stages, [
  'restore',
  'reduce',
  'delta',
  'gate',
  'retrieval',
  'draft',
  'audit',
  'persist',
  'stream',
]);
assert.equal(events.filter(event => event.type === 'done').length, 1);
assert.equal(events.at(-1).type, 'done');
assert.match(
  events.filter(event => event.type === 'packet' && event.packet.packetType === 'canonical_response')
    .map(event => event.packet.content.text).join(''),
  /present boundary of the argument/,
);
assert.doesNotMatch(res.output, /draft that must remain hidden/i);
assert.deepEqual(
  events.filter(event => event.type === 'packet').map(event => event.packet.sequence),
  [1, 2, 3, 4],
);
assert.ok(
  events.findIndex(event => event.type === 'canonical_complete')
    > events.findIndex(event => event.type === 'packet' && event.packet.sequence === 2),
);

const continuation = await executeFollowUp(
  'integration_456',
  'But non-identification still leaves agency without a location.',
);
assert.equal(modelCallCount, 10);
assert.equal(committedBodies.length, 2);
assert.equal(committedBodies[1].p_expected_version, 1);
assert.equal(committedBodies[1].p_state.turn, 2);
assert.equal(committedBodies[1].p_state.inquiryTrajectory.length, 2);
const continuationEvents = continuation.output
  .split('\n')
  .filter(line => line.startsWith('data: '))
  .map(line => JSON.parse(line.slice(6)));
assert.equal(continuationEvents.at(-1).stateVersion, 2);

const [tabA, tabB] = await Promise.all([
  executeFollowUp('integration_tab_a', 'A follow-up from the first tab.'),
  executeFollowUp('integration_tab_b', 'A simultaneous follow-up from the second tab.'),
]);
assert.equal(committedBodies.length, 4);
assert.equal(committedBodies[2].p_expected_version, 2);
assert.equal(committedBodies[3].p_expected_version, 2);
assert.equal(canonicalVersion, 3, 'A racing tab overwrote canonical state');
assert.equal(
  [tabA, tabB].map(streamEvents)
    .filter(tabEvents => tabEvents.some(event => event.type === 'state_conflict')).length,
  1,
  'The stale tab did not receive a state conflict event',
);

const falsePositive = await classifyFollowUpContext({
  clientHint: true,
  inquiryKey: 'anon:forged-client-hint',
  inquiryToken: 'x'.repeat(43),
  threadId: null,
  ownerUserId: null,
  shareId: null,
});
assert.equal(falsePositive.isFollowUp, false, 'A forged client hint classified as follow-up');
const falseNegativeKey = 'server:false-negative-check';
const falseNegative = await classifyFollowUpContext({
  clientHint: false,
  inquiryKey: falseNegativeKey,
  inquiryToken: createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY)
    .update(`prism-inquiry:${falseNegativeKey}`)
    .digest('base64url'),
  threadId: null,
  ownerUserId: null,
  shareId: null,
});
assert.equal(falseNegative.isFollowUp, true, 'Server-authenticated context was missed');

process.env.PERSISTENT_INQUIRY_RUNTIME_ENABLED = 'false';
allowKillSwitchDelta = true;
assert.equal(persistentInquiryRuntimeEnabled(), false);
const commitsBeforeKillSwitch = committedBodies.length;
const callsBeforeKillSwitch = modelCallCount;
const disabledRuntime = await executeFollowUp(
  'integration_runtime_disabled',
  'A follow-up while the persistent runtime is disabled.',
);
const disabledEvents = streamEvents(disabledRuntime);
assert.equal(modelCallCount, callsBeforeKillSwitch + 1);
assert.equal(committedBodies.length, commitsBeforeKillSwitch);
assert.equal(disabledEvents.some(event => event.type === 'stage'), false);
assert.equal(disabledEvents.at(-1)?.runtimeDisabled, true);
process.env.PERSISTENT_INQUIRY_RUNTIME_ENABLED = 'true';
allowKillSwitchDelta = false;

for (const mode of ['provider_error', 'timeout', 'malformed', 'invalid', 'interrupted']) {
  auditMode = mode;
  const commitsBefore = committedBodies.length;
  const stateBefore = JSON.stringify(canonicalState);
  const failure = await executeFollowUp(
    `integration_audit_${mode}`,
    `Audit failure case: ${mode}`,
  );
  const failureEvents = streamEvents(failure);
  assert.equal(
    failureEvents.some(event => event.type === 'delta'),
    false,
    `${mode} leaked unaudited prose`,
  );
  assert.equal(committedBodies.length, commitsBefore, `${mode} mutated canonical state`);
  assert.equal(JSON.stringify(canonicalState), stateBefore, `${mode} changed canonical state`);
  if (mode !== 'interrupted') {
    assert.equal(failureEvents.at(-1)?.type, 'error', `${mode} did not fail closed`);
  }
}
auditMode = 'valid';

commitMode = 'unavailable';
const commitsBeforeUnavailable = committedBodies.length;
const unavailable = await executeFollowUp(
  'integration_persist_unavailable',
  'A response whose state commit will fail.',
);
const unavailableEvents = streamEvents(unavailable);
assert.equal(committedBodies.length, commitsBeforeUnavailable);
assert.equal(unavailableEvents.some(event => event.type === 'packet'), false);
assert.equal(unavailableEvents.at(-1)?.type, 'error');
assert.equal(committedBodies.length, commitsBeforeUnavailable);
commitMode = 'valid';

console.log('Persistent follow-up pipeline integration checks passed.');
