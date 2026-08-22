export const PRISM_ARTIFACT_CORE_CONTRACT = `
RUNTIME CONSTITUTION OUTPUT — AUTHORITATIVE ARTIFACT CORE

Return only one valid JSON object using this exact shape. This contract replaces the legacy full-response output shape for this call. Produce the smallest sufficient standalone interpretation; optional Framework and contextual enrichment are generated later and MUST NOT appear here.

{
  "response_mode": "conversational | reflective | theological",
  "proposition": "The material proposition or question actually being interpreted.",
  "scope": "The bounded scope of this inquiry.",
  "jurisdiction": "The domain in which the claim must be adjudicated.",
  "governing_authority": "The authority legitimately governing that domain, stated without disguising commitments as neutrality.",
  "observations": ["Material observation or testimony."],
  "inferences": ["Material inference, kept distinct from observation."],
  "assumptions": ["Material assumption on any side."],
  "epistemic_boundaries": ["What cannot presently be established."],
  "thesis": "The canonical thesis.",
  "conclusions": ["Warranted conclusion."],
  "qualifications": ["Necessary qualification."],
  "unresolved": ["Genuinely unresolved matter."],
  "orientation": "Two or three concise sentences recognizing the actual human and intellectual shape of the query. No generic preamble or framework display.",
  "canonical_response": "A complete, direct, standalone response in polished prose. It must preserve the full epistemic quality of The Prism while excluding optional Framework exposition. Paragraph breaks are permitted. On an initial inquiry, end with one query-derived open door only when it is load-bearing.",
  "open_door_question": "A query-specific question when constitutionally warranted; otherwise empty.",
  "verse_identified": "Reference or empty.",
  "verse_text": "Accurate text or empty. Never fabricate."
}
`;

const artifactStringArray = Object.freeze({
  type: 'array',
  items: Object.freeze({ type: 'string' }),
});

export const PRISM_ARTIFACT_CORE_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: Object.freeze({
    response_mode: Object.freeze({ type: 'string', enum: ['conversational', 'reflective', 'theological'] }),
    proposition: Object.freeze({ type: 'string' }),
    scope: Object.freeze({ type: 'string' }),
    jurisdiction: Object.freeze({ type: 'string' }),
    governing_authority: Object.freeze({ type: 'string' }),
    observations: artifactStringArray,
    inferences: artifactStringArray,
    assumptions: artifactStringArray,
    epistemic_boundaries: artifactStringArray,
    thesis: Object.freeze({ type: 'string' }),
    conclusions: artifactStringArray,
    qualifications: artifactStringArray,
    unresolved: artifactStringArray,
    orientation: Object.freeze({ type: 'string' }),
    canonical_response: Object.freeze({ type: 'string' }),
    open_door_question: Object.freeze({ type: 'string' }),
    verse_identified: Object.freeze({ type: 'string' }),
    verse_text: Object.freeze({ type: 'string' }),
  }),
  required: Object.freeze([
    'response_mode',
    'proposition',
    'scope',
    'jurisdiction',
    'governing_authority',
    'observations',
    'inferences',
    'assumptions',
    'epistemic_boundaries',
    'thesis',
    'conclusions',
    'qualifications',
    'unresolved',
    'orientation',
    'canonical_response',
    'open_door_question',
    'verse_identified',
    'verse_text',
  ]),
});

export const PRISM_ENRICHMENT_CONTRACT = `
Generate inspectable enrichment for the supplied sealed Interpretation Artifact. Return only valid JSON. Do not revise, contradict, qualify beyond, or replace the artifact. If the artifact does not warrant a section, return an empty value.

{
  "interpretive_context": "Relevant textual, historical, scientific, philosophical, legal, or practical context with proportional provenance boundaries.",
  "framework": {
    "prism_summary": "Core relational reframing.",
    "entanglement": "Initiating relational contact where relevant.",
    "coherence_alignment": "What alignment looks like.",
    "noise_decoherence": "The material distortion or failed assumption.",
    "telos_insight": "Directional purpose where warranted.",
    "olam_haba": "Non-local or completed view where warranted."
  },
  "key_terms": [
    { "term": "Term", "hebrew": "Original script if applicable", "prism_meaning": "Query-specific meaning." }
  ],
  "constraint_findings": ["Inspectable constraint finding."],
  "future_analysis_projections": ["Bounded future concept-card subject, not generated content."]
}
`;

export const PRISM_ENRICHMENT_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'interpretive_context',
    'framework',
    'key_terms',
    'constraint_findings',
    'future_analysis_projections',
  ],
  properties: {
    interpretive_context: { type: 'string' },
    framework: {
      type: 'object',
      additionalProperties: false,
      required: [
        'prism_summary',
        'entanglement',
        'coherence_alignment',
        'noise_decoherence',
        'telos_insight',
        'olam_haba',
      ],
      properties: {
        prism_summary: { type: 'string' },
        entanglement: { type: 'string' },
        coherence_alignment: { type: 'string' },
        noise_decoherence: { type: 'string' },
        telos_insight: { type: 'string' },
        olam_haba: { type: 'string' },
      },
    },
    key_terms: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['term', 'hebrew', 'prism_meaning'],
        properties: {
          term: { type: 'string' },
          hebrew: { type: 'string' },
          prism_meaning: { type: 'string' },
        },
      },
    },
    constraint_findings: { type: 'array', items: { type: 'string' } },
    future_analysis_projections: { type: 'array', maxItems: 8, items: { type: 'string' } },
  },
});

export function serializeArtifactForEnrichment(artifact) {
  const {
    ownerUserId,
    threadId,
    createdAt,
    sealedAt,
    ...epistemicArtifact
  } = artifact;
  return JSON.stringify(epistemicArtifact);
}
