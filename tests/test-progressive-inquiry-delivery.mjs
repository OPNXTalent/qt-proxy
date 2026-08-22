import assert from 'node:assert/strict';
import {
  PACKET_TYPES,
  createCanonicalPackets,
  createCompletionKey,
  createEnrichmentPackets,
  hasSubstantiveEnrichment,
  hasSubstantiveEnrichmentPacket,
  stableArtifactId,
  validateArtifactCore,
  validateEnrichment,
} from '../lib/interpretation-artifact.js';

const inquiryKey = 'server:constitutional-test-inquiry';
const artifact = validateArtifactCore({
  proposition: 'A material proposition',
  scope: 'This inquiry',
  jurisdiction: 'logical',
  governing_authority: 'logic and available evidence',
  observations: ['The user made a claim.'],
  inferences: ['The claim has an implication.'],
  assumptions: ['The implication is exhaustive.'],
  epistemic_boundaries: ['The available evidence is incomplete.'],
  thesis: 'The conclusion must remain proportional.',
  conclusions: ['The exhaustive inference does not follow.'],
  qualifications: ['Further evidence may change the result.'],
  unresolved: ['What further evidence exists?'],
  orientation: 'The question turns on whether the implication is exhaustive.',
  canonical_response: 'The implication is possible, but it does not follow from the stated observation alone.',
  response_mode: 'reflective',
}, {
  inquiryId: inquiryKey,
  inquiryKey,
  revision: 1,
  query: 'Does this observation prove the conclusion?',
});

assert.equal(artifact.status, 'sealed');
assert.equal(artifact.artifactId, stableArtifactId(inquiryKey));
assert.equal(Object.isFrozen(artifact), true);
assert.equal(stableArtifactId(inquiryKey), stableArtifactId(inquiryKey));

const canonical = createCanonicalPackets(artifact);
assert.deepEqual(canonical.map(packet => packet.packetType), [
  PACKET_TYPES.ORIENTATION,
  PACKET_TYPES.CANONICAL,
]);
assert.deepEqual(canonical.map(packet => packet.sequence), [1, 2]);
assert.equal(canonical[0].artifactId, canonical[1].artifactId);
assert.equal(canonical[0].artifactRevision, canonical[1].artifactRevision);
assert.equal(createCanonicalPackets(artifact)[0].packetId, canonical[0].packetId);

const enrichment = validateEnrichment({
  interpretive_context: 'The observation supplies less than the conclusion requires.',
  framework: {
    prism_summary: 'Relation does not erase evidential boundaries.',
    noise_decoherence: 'Possibility was promoted to necessity.',
  },
  key_terms: [{ term: 'Inference', prism_meaning: 'A conclusion drawn from ground.' }],
  constraint_findings: ['The inference exceeds the observation.'],
  future_analysis_projections: ['Compare alternative explanations.'],
});
const attached = createEnrichmentPackets(artifact, enrichment);
assert.deepEqual(attached.map(packet => packet.packetType), [
  PACKET_TYPES.CONTEXT,
  PACKET_TYPES.ANALYSIS,
]);
assert.deepEqual(attached.map(packet => packet.sequence), [3, 4]);
assert.equal(createEnrichmentPackets(artifact, enrichment)[1].packetId, attached[1].packetId);

const emptyEnrichment = validateEnrichment({
  interpretive_context: '',
  framework: {
    prism_summary: '',
    entanglement: '',
    coherence_alignment: '',
    noise_decoherence: '',
    telos_insight: '',
    olam_haba: '',
  },
  key_terms: [],
  constraint_findings: [],
  future_analysis_projections: [],
});
assert.equal(hasSubstantiveEnrichment(emptyEnrichment), false);
assert.throws(() => createEnrichmentPackets(artifact, emptyEnrichment), /ENRICHMENT_EMPTY/);
assert.equal(hasSubstantiveEnrichmentPacket({
  packetType: 'prism_analysis',
  content: { framework: emptyEnrichment.framework, keyTerms: [] },
}), false);
assert.equal(hasSubstantiveEnrichmentPacket(attached[1]), true);

const completionKey = createCompletionKey({ inquiryId: artifact.inquiryId, revision: 1 });
assert.equal(completionKey, createCompletionKey({ inquiryId: artifact.inquiryId, revision: 1 }));
assert.notEqual(completionKey, createCompletionKey({ inquiryId: artifact.inquiryId, revision: 2 }));

assert.throws(() => validateArtifactCore({}, {
  inquiryId: inquiryKey,
  inquiryKey,
  revision: 1,
  query: 'x',
}), /ARTIFACT_CORE_INCOMPLETE/);

console.log('progressive inquiry delivery contract tests passed');
