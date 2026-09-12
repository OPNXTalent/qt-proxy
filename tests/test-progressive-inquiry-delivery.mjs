import assert from 'node:assert/strict';
import {
  PACKET_TYPES,
  createCanonicalPackets,
  createCompletionKey,
  stableArtifactId,
  validateArtifactCore,
} from '../lib/interpretation-artifact.js';

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

assert.deepEqual(Object.values(PACKET_TYPES), ['inquiry_orientation', 'canonical_response', 'prism_analysis']);

const completionKey = createCompletionKey({ inquiryId: artifact.inquiryId, revision: 1 });
assert.equal(completionKey, createCompletionKey({ inquiryId: artifact.inquiryId, revision: 1 }));
assert.notEqual(completionKey, createCompletionKey({ inquiryId: artifact.inquiryId, revision: 2 }));
assert.throws(() => validateArtifactCore({}, { inquiryKey, revision: 1, query: 'x' }), /ARTIFACT_CORE_INCOMPLETE/);
console.log('reconstructed progressive inquiry delivery contract tests passed');
