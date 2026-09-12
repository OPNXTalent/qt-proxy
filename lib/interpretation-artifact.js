import { createHash, randomUUID } from 'node:crypto';

export const RUNTIME_CONSTITUTION_VERSION = '1.0';
export const ARTIFACT_SCHEMA_VERSION = 1;
export const PACKET_SCHEMA_VERSION = 1;

export const PACKET_TYPES = Object.freeze({
  ORIENTATION: 'inquiry_orientation',
  CANONICAL: 'canonical_response',
  CONTEXT: 'interpretive_context',
  EXPLORE: 'explore_context',
  ANALYSIS: 'prism_analysis',
});

const clean = (value, max = 12000) => String(value || '').trim().slice(0, max);
const strings = (value, maxItems = 12, maxChars = 2000) => (
  Array.isArray(value) ? value.slice(0, maxItems).map(item => clean(item, maxChars)).filter(Boolean) : []
);

export function stableArtifactId(inquiryKey) {
  const hex = createHash('sha256').update(`prism-artifact:${clean(inquiryKey, 4000)}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function validateArtifactCore(raw, {
  inquiryId,
  inquiryKey,
  revision,
  query,
  ownerUserId = null,
  threadId = null,
  createdAt = new Date().toISOString(),
} = {}) {
  if (!raw || typeof raw !== 'object') throw new Error('ARTIFACT_CORE_INVALID');
  const orientation = clean(raw.orientation, 2400);
  const canonicalResponse = clean(raw.canonical_response ?? raw.canonicalResponse, 16000);
  const proposition = clean(raw.proposition, 4000);
  const thesis = clean(raw.thesis, 4000);
  if (!canonicalResponse || !proposition || !thesis) {
    throw new Error('ARTIFACT_CORE_INCOMPLETE');
  }
  if (!Number.isInteger(revision) || revision < 1) throw new Error('ARTIFACT_REVISION_INVALID');
  const artifactId = stableArtifactId(inquiryKey || inquiryId);
  return Object.freeze({
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    constitutionVersion: RUNTIME_CONSTITUTION_VERSION,
    inquiryId: clean(inquiryId || inquiryKey, 4000),
    artifactId,
    revision,
    query: clean(query, 16000),
    proposition,
    scope: clean(raw.scope, 2000),
    jurisdiction: clean(raw.jurisdiction, 1000),
    governingAuthority: clean(raw.governing_authority ?? raw.governingAuthority, 2000),
    observations: strings(raw.observations),
    inferences: strings(raw.inferences),
    assumptions: strings(raw.assumptions),
    epistemicBoundaries: strings(raw.epistemic_boundaries ?? raw.epistemicBoundaries),
    thesis,
    conclusions: strings(raw.conclusions),
    qualifications: strings(raw.qualifications),
    unresolved: strings(raw.unresolved),
    orientation,
    canonicalResponse,
    openDoorQuestion: clean(raw.open_door_question ?? raw.openDoorQuestion, 1200),
    verseIdentified: clean(raw.verse_identified ?? raw.verseIdentified, 300),
    verseText: clean(raw.verse_text ?? raw.verseText, 4000),
    responseMode: clean(raw.response_mode ?? raw.responseMode, 100) || 'reflective',
    ownerUserId,
    threadId,
    createdAt,
    sealedAt: createdAt,
    status: 'sealed',
  });
}

function packetId(artifact, type, sequence) {
  return createHash('sha256')
    .update(`${artifact.artifactId}:${artifact.revision}:${sequence}:${type}`)
    .digest('base64url');
}

export function createPacket(artifact, type, sequence, content, status = 'complete') {
  if (!artifact || artifact.status !== 'sealed') throw new Error('PACKET_ARTIFACT_NOT_SEALED');
  if (!Object.values(PACKET_TYPES).includes(type)) throw new Error('PACKET_TYPE_INVALID');
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error('PACKET_SEQUENCE_INVALID');
  return Object.freeze({
    constitutionVersion: RUNTIME_CONSTITUTION_VERSION,
    packetSchemaVersion: PACKET_SCHEMA_VERSION,
    inquiryId: artifact.inquiryId,
    artifactId: artifact.artifactId,
    artifactRevision: artifact.revision,
    packetId: packetId(artifact, type, sequence),
    packetType: type,
    sequence,
    status,
    dependencies: sequence === 1 ? [] : [sequence - 1],
    createdAt: new Date().toISOString(),
    content,
  });
}

export function createCanonicalPackets(artifact) {
  return [
    createPacket(artifact, PACKET_TYPES.ORIENTATION, 1, { text: artifact.orientation }),
    createPacket(artifact, PACKET_TYPES.CANONICAL, 2, {
      text: artifact.canonicalResponse,
      openDoorQuestion: artifact.openDoorQuestion,
      verseIdentified: artifact.verseIdentified,
      verseText: artifact.verseText,
      responseMode: artifact.responseMode,
    }),
  ];
}

export function validateContextCompanion(raw = {}, approvedConceptIds = new Set()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('CONTEXT_COMPANION_INVALID');
  const interpretiveContext = clean(raw.interpretive_context ?? raw.interpretiveContext, 12000);
  const candidateIds = Array.isArray(raw.concept_node_ids ?? raw.conceptNodeIds)
    ? (raw.concept_node_ids ?? raw.conceptNodeIds)
    : [];
  const conceptNodeIds = [...new Set(candidateIds.map(id => clean(id, 200)).filter(id => approvedConceptIds.has(id)))].slice(0, 4);
  return Object.freeze({ interpretiveContext, conceptNodeIds });
}

export function createContextPackets(artifact, companion, conceptNodesById = {}) {
  const packets = [];
  if (companion?.interpretiveContext) {
    packets.push(createPacket(artifact, PACKET_TYPES.CONTEXT, 3, { text: companion.interpretiveContext }));
  }
  const nodes = (companion?.conceptNodeIds || [])
    .map(id => conceptNodesById[id])
    .filter(Boolean)
    .map(node => ({
      id: node.id,
      title: node.title,
      category: node.category,
      primarySourceLabel: node.primarySourceLabel,
      shortSummary: node.shortSummary,
    }));
  if (nodes.length) packets.push(createPacket(
    artifact,
    PACKET_TYPES.EXPLORE,
    companion?.interpretiveContext ? 4 : 3,
    { nodes },
  ));
  return packets;
}

export function createCompletionKey({ inquiryId, revision }) {
  return createHash('sha256').update(`${inquiryId}:${revision}:canonical-completion`).digest('base64url');
}

export function newInquiryId() {
  return randomUUID();
}
