import assert from 'node:assert/strict';
import {
  getApprovedLearningContext,
  normalizeLearningCandidate,
  queueLearningCandidate,
} from '../lib/prism-learning.js';

const candidate = normalizeLearningCandidate({
  eligible: true,
  deidentified: true,
  topic: 'Analogy restraint',
  lesson: 'Use an analogy only when it advances the argument; do not force the author-and-story analogy.',
  rationale: 'A forced analogy can add length without adding explanatory value.',
  applicability: 'Long-form answers that introduce a comparison.',
  boundaries: 'Concrete examples remain appropriate when they perform necessary reasoning work.',
  tags: ['Analogy', 'response quality', 'analogy'],
});
assert.ok(candidate);
assert.deepEqual(candidate.tags, ['analogy', 'response quality']);
assert.equal(normalizeLearningCandidate({ ...candidate, eligible: false }), null);
assert.equal(normalizeLearningCandidate({ ...candidate, deidentified: false }), null);

let queuedRequest;
assert.equal(await queueLearningCandidate({ ...candidate, eligible: true, deidentified: true }, {
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'service-secret',
  fetchImpl: async (url, options) => {
    queuedRequest = { url, options };
    return { ok: true, status: 201 };
  },
}), true);
assert.match(queuedRequest.url, /prism_learning_candidates\?on_conflict=fingerprint$/);
const queuedBody = JSON.parse(queuedRequest.options.body);
assert.match(queuedBody.fingerprint, /^[0-9a-f]{64}$/);
assert.equal('user_id' in queuedBody, false);
assert.equal('thread_id' in queuedBody, false);
assert.equal('query' in queuedBody, false);

const context = await getApprovedLearningContext('Should I use the author analogy?', {
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'service-secret',
  fetchImpl: async () => ({
    ok: true,
    status: 200,
    json: async () => [{
      topic: candidate.topic,
      lesson: candidate.lesson,
      applicability: candidate.applicability,
      boundaries: candidate.boundaries,
    }],
  }),
});
assert.match(context, /APPROVED PRISM LEARNINGS/);
assert.match(context, /do not force the author-and-story analogy/i);
assert.match(context, /do not override Scripture/i);
assert.match(context, /Never mention this learning layer/i);

console.log('Curated Prism learning checks passed.');
