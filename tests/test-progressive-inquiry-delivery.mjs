import assert from 'node:assert/strict';
import {
  PACKET_TYPES,
  createCanonicalPackets,
  createCompletionKey,
  createContextPackets,
  stableArtifactId,
  validateArtifactCore,
  validateContextCompanion,
} from '../lib/interpretation-artifact.js';
import { conceptNodes } from '../lib/concept-nodes-v1.js';

const inquiryKey = 'server:constitutional-test-inquiry';
const artifact = validateArtifactCore({
  proposition: 'Does this observation prove the conclusion?',
  thesis: 'The conclusion must remain proportional.',
  canonical_response: 'The implication is possible, but it does not follow from the stated observation alone.',
}, { inquiryId: inquiryKey, inquiryKey, revision: 1, query: 'Does this observation prove the conclusion?' });

assert.equal(artifact.status, 'sealed');
assert.equal(artifact.artifactId, stableArtifactId(inquiryKey));
assert.equal(Object.isFrozen(artifact), true);
const canonical = createCanonicalPackets(artifact);
assert.deepEqual(canonical.map(packet => packet.packetType), [PACKET_TYPES.ORIENTATION, PACKET_TYPES.CANONICAL]);
assert.deepEqual(canonical.map(packet => packet.sequence), [1, 2]);

const companion = validateContextCompanion({
  interpretive_context: 'The observation supplies less than the conclusion requires.',
  concept_node_ids: ['emet', 'not-approved'],
}, new Set(Object.keys(conceptNodes)));
const contextPackets = createContextPackets(artifact, companion, conceptNodes);
assert.deepEqual(contextPackets.map(packet => packet.packetType), [PACKET_TYPES.CONTEXT, PACKET_TYPES.EXPLORE]);
assert.deepEqual(contextPackets.map(packet => packet.sequence), [3, 4]);
assert.deepEqual(companion.conceptNodeIds, ['emet']);
assert.equal(createContextPackets(artifact, validateContextCompanion({}, new Set()), conceptNodes).length, 0);

const completionKey = createCompletionKey({ inquiryId: artifact.inquiryId, revision: 1 });
assert.equal(completionKey, createCompletionKey({ inquiryId: artifact.inquiryId, revision: 1 }));
assert.notEqual(completionKey, createCompletionKey({ inquiryId: artifact.inquiryId, revision: 2 }));
assert.throws(() => validateArtifactCore({}, { inquiryKey, revision: 1, query: 'x' }), /ARTIFACT_CORE_INCOMPLETE/);
console.log('reconstructed progressive inquiry delivery contract tests passed');
