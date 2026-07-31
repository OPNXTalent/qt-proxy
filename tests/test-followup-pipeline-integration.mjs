import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-test-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-key';
process.env.OPENAI_API_KEY = 'openai-test-key';
process.env.ANTHROPIC_API_KEY = 'anthropic-test-key';

let auditCompleted = false;
let modelCallCount = 0;
const committedBodies = [];
let canonicalState = null;
let canonicalVersion = 0;

globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  if (target.includes('/query_log') && (!options.method || options.method === 'GET')) {
    return Response.json([]);
  }
  if (target.includes('/query_log') && options.method === 'POST') {
    return new Response('', { status: 201 });
  }
  if (target.includes('/inquiry_states?')) {
    return Response.json(canonicalState
      ? [{ version: canonicalVersion, state: canonicalState }]
      : []);
  }
  if (target.includes('/v1/embeddings')) {
    return Response.json({ data: [{ embedding: [0.1, 0.2, 0.3] }] });
  }
  if (target.includes('/rpc/match_corpus')) return Response.json([]);
  if (target.includes('/rpc/commit_inquiry_state')) {
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
            draftPreparation: 'Test the inference directly.',
          },
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

const { default: handler } = await import('../api/interpret.js');

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
      assert.equal(auditCompleted, true, 'Unaudited prose reached the response stream');
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
  req.method = 'POST';
  req.url = '/api/interpret';
  req.headers = { host: 'localhost', 'x-forwarded-for': '127.0.0.1' };
  req.socket = { remoteAddress: '127.0.0.1' };
  req.body = {
    messages: [{ role: 'user', content: query }],
    rawQuery: query,
    isFollowUp: true,
    inquiryKey: 'anon:integration-test-12345',
    inquirySubject: 'Whether responsibility survives prior causes',
    requestId,
  };
  const res = new MockResponse();
  await handler(req, res);
  return res;
}

const res = await executeFollowUp('integration_123', 'Where exactly does agency enter?');

assert.equal(res.statusCode, 200);
assert.equal(res.writableEnded, true);
assert.equal(modelCallCount, 3, 'Expected reducer/gate, draft, and precision audit');
assert.equal(committedBodies.length, 1, 'Canonical state was not committed');
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
const concurrentEvents = [tabA, tabB].flatMap(response => response.output
  .split('\n')
  .filter(line => line.startsWith('data: '))
  .map(line => JSON.parse(line.slice(6))));
assert.equal(
  concurrentEvents.filter(event => event.type === 'state_conflict').length,
  1,
  'The stale tab did not receive a state conflict event',
);

console.log('Persistent follow-up pipeline integration checks passed.');
