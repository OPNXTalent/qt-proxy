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

async function acknowledge(response, requestId = 'acknowledge_123') {
  const done = streamEvents(response).find(event => event.type === 'done');
  assert.equal(typeof done?.pendingCommitToken, 'string', 'Missing pending commit token');
  const req = new EventEmitter();
  req.method = 'POST';
  req.url = '/api/interpret';
  req.headers = { host: 'localhost', 'x-forwarded-for': '127.0.0.1' };
  req.socket = { remoteAddress: '127.0.0.1' };
  req.body = {
    operation: 'commit_inquiry_state',
    pendingCommitToken: done.pendingCommitToken,
    requestId,
  };
  const res = new MockResponse();
  await handler(req, res);
  return { res, body: JSON.parse(res.output) };
}

const res = await executeFollowUp('integration_123', 'Where exactly does agency enter?');

assert.equal(res.statusCode, 200);
assert.equal(res.writableEnded, true);
assert.equal(modelCallCount, 3, 'Expected reducer/gate, draft, and precision audit');
assert.equal(committedBodies.length, 0, 'State committed before browser acknowledgement');
const firstAcknowledgement = await acknowledge(res, 'acknowledge_first');
assert.equal(firstAcknowledgement.body.committed, true);
assert.equal(committedBodies.length, 1, 'Acknowledged canonical state was not committed');
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
  'stream',
  'persist',
]);
assert.equal(events.filter(event => event.type === 'done').length, 1);
assert.equal(events.at(-1).type, 'done');
assert.match(
  events.filter(event => event.type === 'delta').map(event => event.text).join(''),
  /present boundary of the argument/,
);
assert.doesNotMatch(res.output, /draft that must remain hidden/i);

const continuation = await executeFollowUp(
  'integration_456',
  'But non-identification still leaves agency without a location.',
);
assert.equal(modelCallCount, 6);
assert.equal(committedBodies.length, 1, 'Continuation committed before acknowledgement');
const continuationAcknowledgement = await acknowledge(continuation, 'acknowledge_continuation');
assert.equal(continuationAcknowledgement.body.committed, true);
assert.equal(committedBodies.length, 2);
assert.equal(committedBodies[1].p_expected_version, 1);
assert.equal(committedBodies[1].p_state.turn, 2);
assert.equal(committedBodies[1].p_state.inquiryTrajectory.length, 2);
const continuationEvents = continuation.output
  .split('\n')
  .filter(line => line.startsWith('data: '))
  .map(line => JSON.parse(line.slice(6)));
assert.equal(continuationEvents.at(-1).stateVersion, 1);

const [tabA, tabB] = await Promise.all([
  executeFollowUp('integration_tab_a', 'A follow-up from the first tab.'),
  executeFollowUp('integration_tab_b', 'A simultaneous follow-up from the second tab.'),
]);
assert.equal(committedBodies.length, 2, 'Racing responses committed before acknowledgement');
const [tabAAcknowledgement, tabBAcknowledgement] = await Promise.all([
  acknowledge(tabA, 'acknowledge_tab_a'),
  acknowledge(tabB, 'acknowledge_tab_b'),
]);
assert.equal(committedBodies.length, 4);
assert.equal(committedBodies[2].p_expected_version, 2);
assert.equal(committedBodies[3].p_expected_version, 2);
assert.equal(canonicalVersion, 3, 'A racing tab overwrote canonical state');
assert.equal(
  [tabAAcknowledgement.body, tabBAcknowledgement.body]
    .filter(result => result.conflict).length,
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
const unavailableDone = unavailableEvents.find(event => event.type === 'done');
assert.equal(unavailableDone.committed, false);
assert.equal(unavailableDone.canonicalState, false);
const unavailableAcknowledgement = await acknowledge(unavailable, 'acknowledge_unavailable');
assert.equal(unavailableAcknowledgement.res.statusCode, 503);
assert.equal(unavailableAcknowledgement.body.unavailable, true);
assert.equal(committedBodies.length, commitsBeforeUnavailable);
commitMode = 'valid';

const validPending = streamEvents(await executeFollowUp(
  'integration_tamper_source',
  'A response whose pending state must resist tampering.',
)).find(event => event.type === 'done')?.pendingCommitToken;
assert.ok(verifyPendingInquiryCommit(validPending));
const tamperedPending = `${validPending.slice(0, -1)}${validPending.endsWith('A') ? 'B' : 'A'}`;
assert.equal(verifyPendingInquiryCommit(tamperedPending), null);
const commitsBeforeTamper = committedBodies.length;
const tamperReq = new EventEmitter();
tamperReq.method = 'POST';
tamperReq.url = '/api/interpret';
tamperReq.headers = { host: 'localhost', 'x-forwarded-for': '127.0.0.1' };
tamperReq.socket = { remoteAddress: '127.0.0.1' };
tamperReq.body = {
  operation: 'commit_inquiry_state',
  pendingCommitToken: tamperedPending,
  requestId: 'acknowledge_tampered',
};
const tamperRes = new MockResponse();
await handler(tamperReq, tamperRes);
assert.equal(tamperRes.statusCode, 400);
assert.equal(committedBodies.length, commitsBeforeTamper);

console.log('Persistent follow-up pipeline integration checks passed.');
