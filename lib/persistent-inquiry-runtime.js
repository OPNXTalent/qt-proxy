const STATE_SCHEMA_VERSION = 1;
const MAX_LIST_ITEMS = 12;
const MAX_TRAJECTORY_ITEMS = 16;
const MAX_TEXT_LENGTH = 600;

export const FOLLOWUP_STAGE_LABELS = Object.freeze({
  restore: 'Restoring inquiry state…',
  reduce: 'Reducing proposition…',
  delta: 'Detecting structural changes…',
  gate: 'Applying constraint gate…',
  retrieval: 'Retrieving relevant context…',
  draft: 'Preparing interpretation…',
  audit: 'Auditing interpretation…',
  stream: 'Preparing response…',
  persist: 'Preserving inquiry state…',
});

export function createInitialInquiryState(subject = '') {
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    version: 0,
    turn: 0,
    orientation: cleanText(subject),
    establishedGround: [],
    unresolvedClaims: [],
    activeAssumptions: [],
    constraintStatus: {
      ontological: null,
      logical: null,
      phenomenological: null,
      relational: null,
    },
    falsifiabilityIssues: [],
    dominantDrift: null,
    lastStructuralChange: null,
    activeFrameworkSections: [],
    inquiryTrajectory: [],
    confidence: {
      orientation: { level: 'tentative', score: 0.5 },
      dominantDrift: { level: 'tentative', score: 0 },
      activeAssumptions: { level: 'tentative', score: 0 },
    },
  };
}

function cleanText(value, max = MAX_TEXT_LENGTH) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanStringList(value, limit = MAX_LIST_ITEMS) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => cleanText(item)).filter(Boolean))].slice(0, limit);
}

function cleanConstraintStatus(value, fallback) {
  const allowed = new Set(['holds', 'strained', 'fails', 'open', null]);
  const next = {};
  for (const key of ['ontological', 'logical', 'phenomenological', 'relational']) {
    const candidate = value?.[key];
    next[key] = allowed.has(candidate) ? candidate : fallback?.[key] ?? null;
  }
  return next;
}

function cleanConfidenceEntry(value, fallback = { level: 'tentative', score: 0 }) {
  const levels = new Set(['directly_established', 'inferred', 'tentative']);
  const level = levels.has(value?.level) ? value.level : fallback.level;
  const numeric = Number(value?.score);
  const score = Number.isFinite(numeric)
    ? Math.max(0, Math.min(1, numeric))
    : fallback.score;
  return { level, score };
}

export function validateInquiryState(candidate, subject = '') {
  const base = createInitialInquiryState(subject);
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return base;

  const trajectory = Array.isArray(candidate.inquiryTrajectory)
    ? candidate.inquiryTrajectory
      .map(item => ({
        turn: Math.max(1, Math.floor(Number(item?.turn) || 1)),
        change: cleanText(item?.change, 240),
        confidence: cleanConfidenceEntry(item?.confidence, {
          level: 'inferred',
          score: 0.6,
        }),
      }))
      .filter(item => item.change)
      .slice(-MAX_TRAJECTORY_ITEMS)
    : [];

  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    version: Math.max(0, Math.floor(Number(candidate.version) || 0)),
    turn: Math.max(0, Math.floor(Number(candidate.turn) || 0)),
    orientation: cleanText(candidate.orientation) || base.orientation,
    establishedGround: cleanStringList(candidate.establishedGround),
    unresolvedClaims: cleanStringList(candidate.unresolvedClaims),
    activeAssumptions: cleanStringList(candidate.activeAssumptions),
    constraintStatus: cleanConstraintStatus(candidate.constraintStatus, base.constraintStatus),
    falsifiabilityIssues: cleanStringList(candidate.falsifiabilityIssues),
    dominantDrift: cleanText(candidate.dominantDrift, 300) || null,
    lastStructuralChange: cleanText(candidate.lastStructuralChange, 300) || null,
    activeFrameworkSections: cleanStringList(candidate.activeFrameworkSections, 8),
    inquiryTrajectory: trajectory,
    confidence: {
      orientation: cleanConfidenceEntry(candidate.confidence?.orientation, base.confidence.orientation),
      dominantDrift: cleanConfidenceEntry(
        candidate.confidence?.dominantDrift,
        base.confidence.dominantDrift,
      ),
      activeAssumptions: cleanConfidenceEntry(
        candidate.confidence?.activeAssumptions,
        base.confidence.activeAssumptions,
      ),
    },
  };
}

export function parseModelJson(text) {
  if (typeof text !== 'string') throw new Error('MODEL_JSON_MISSING');
  const stripped = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('MODEL_JSON_INVALID');
  return JSON.parse(stripped.slice(start, end + 1));
}

export function validateAnalysis(candidate) {
  const reducer = candidate?.reduction || {};
  const gate = candidate?.constraintGate || {};
  const patch = candidate?.statePatch || {};
  return {
    reduction: {
      primaryProposition: cleanText(reducer.primaryProposition),
      supportingPropositions: cleanStringList(reducer.supportingPropositions, 6),
      rhetoricalLanguage: cleanStringList(reducer.rhetoricalLanguage, 5),
      emotionalLanguage: cleanStringList(reducer.emotionalLanguage, 5),
      examples: cleanStringList(reducer.examples, 5),
      narrative: cleanText(reducer.narrative, 400) || null,
    },
    structuralDelta: cleanText(candidate?.structuralDelta, 300)
      || 'No material structural change detected',
    constraintGate: {
      observations: cleanStringList(gate.observations, 6),
      inferences: cleanStringList(gate.inferences, 6),
      evidenceBoundaries: cleanStringList(gate.evidenceBoundaries, 6),
      unsupportedAssumptions: cleanStringList(gate.unsupportedAssumptions, 6),
      unfalsifiableClaims: cleanStringList(gate.unfalsifiableClaims, 6),
      draftPreparation: cleanText(gate.draftPreparation, 500),
    },
    statePatch: patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {},
  };
}

export function applyInquiryPatch(previous, rawPatch, structuralDelta) {
  const prior = validateInquiryState(previous);
  const allowed = new Set([
    'orientation',
    'establishedGround',
    'unresolvedClaims',
    'activeAssumptions',
    'constraintStatus',
    'falsifiabilityIssues',
    'dominantDrift',
    'activeFrameworkSections',
    'confidence',
    'trajectoryChange',
  ]);
  const patch = Object.fromEntries(
    Object.entries(rawPatch || {}).filter(([key]) => allowed.has(key)),
  );
  const turn = prior.turn + 1;
  const trajectoryChange = cleanText(patch.trajectoryChange || structuralDelta, 240);
  const next = validateInquiryState({
    ...prior,
    ...patch,
    constraintStatus: {
      ...prior.constraintStatus,
      ...(patch.constraintStatus || {}),
    },
    confidence: {
      ...prior.confidence,
      ...(patch.confidence || {}),
    },
    version: prior.version,
    turn,
    lastStructuralChange: cleanText(structuralDelta, 300),
    inquiryTrajectory: trajectoryChange
      ? [...prior.inquiryTrajectory, {
        turn,
        change: trajectoryChange,
        confidence: cleanConfidenceEntry(patch.confidence?.lastStructuralChange, {
          level: 'inferred',
          score: 0.7,
        }),
      }]
      : prior.inquiryTrajectory,
  });
  next.version = prior.version;
  return next;
}

export function buildReducerPrompt({ state, input, userCorrection = false }) {
  return `You are the proposition reducer and lightweight Constraint Gate for The Prism.
Return JSON only. Do not answer the user.

PREVIOUS INQUIRY STATE:
${JSON.stringify(validateInquiryState(state))}

NEW INPUT:
${cleanText(input, 4000)}

USER CORRECTION PRIORITY: ${userCorrection ? 'YES — explicit corrections override inferred state.' : 'NO explicit correction detected.'}

Perform these operations in order:
1. Reduce the input into its primary and supporting propositions. Separate rhetorical language, emotional language, examples, and narrative.
2. Identify only the structural change from the previous inquiry state.
3. Apply a lightweight gate: observations versus inferences, evidence boundaries, unsupported assumptions, and unfalsifiable claims.
4. Return a compact statePatch containing only fields that materially changed. Never restate unchanged state.
5. Confidence must use { "level": "directly_established"|"inferred"|"tentative", "score": 0..1 }. User corrections are directly established.

Required shape:
{
  "reduction": {
    "primaryProposition": "",
    "supportingPropositions": [],
    "rhetoricalLanguage": [],
    "emotionalLanguage": [],
    "examples": [],
    "narrative": null
  },
  "structuralDelta": "",
  "constraintGate": {
    "observations": [],
    "inferences": [],
    "evidenceBoundaries": [],
    "unsupportedAssumptions": [],
    "unfalsifiableClaims": [],
    "draftPreparation": ""
  },
  "statePatch": {
    "trajectoryChange": ""
  }
}`;
}

export function buildDraftPrompt({ state, analysis, input, retrievedContext = '' }) {
  return `Continue a Prism inquiry from established ground.

The Prism is a lens, not an authority. Scripture is the final court of arbitration for scriptural, theological, and religious-metaphysical claims. The Prism itself remains corrigible wherever it is demonstrably inconsistent with Scripture.

Reason silently through the Constraint Quadrant:
- Ontological: what must exist for the proposition to be meaningful?
- Logical: what follows, and what fails under equal scrutiny?
- Phenomenological: what does the proposition account for in experience?
- Relational: does it cohere with the larger relational whole?

Execution discipline:
- Receive the actual proposition, then reduce, constrain, and comment on it.
- Address what changed in the inquiry rather than restarting the original subject.
- Distinguish observation from inference and apply evidential standards symmetrically.
- Do not infer motives, diagnoses, hidden wounds, or emotional states not established by the user.
- Do not convert uncertainty into certainty. Challenge unfalsifiable reasoning without claiming a view has been disproved merely because it remains unproved.
- Prefer a direct comment that identifies what survives and what fails constraint.
- End declaratively. Ask a question only when ambiguity, disagreement, or missing information genuinely prevents a responsible answer.
- Plain prose. No JSON, headings, audit narration, or framework-stage narration.

PERSISTENT INQUIRY STATE:
${JSON.stringify(validateInquiryState(state))}

PROPOSITION AND GATE:
${JSON.stringify(analysis)}

USER'S ACTUAL WORDS:
${cleanText(input, 4000)}

FOCUSED RETRIEVAL:
${retrievedContext || '[No retrieved context]'}

Write the next response in this inquiry. Preserve proportional certainty and the user's ability to correct the frame.`;
}

export function buildAuditPrompt({ input, analysis, draft }) {
  return `Act as a precision epistemic editor, not a second interpreter.

USER INPUT:
${cleanText(input, 4000)}

CONSTRAINT FINDINGS:
${JSON.stringify(analysis.constraintGate)}

DRAFT:
${cleanText(draft, 8000)}

Correct only when necessary:
- unsupported claims or certainty exceeding the grounds
- speculative psychology or invented motives
- failure to distinguish observation from inference
- asymmetric scrutiny
- evasion of an unfalsifiable claim
- a generic or momentum question when a declarative ending is available

Preserve the draft's meaning, voice, and useful distinctions. Do not add a new argument, pastoral language, headings, or audit commentary. Return only the final response text.`;
}

export function buildFocusedRetrievalQuery(state, analysis) {
  return cleanText([
    analysis.reduction.primaryProposition,
    ...analysis.reduction.supportingPropositions,
    state.orientation,
    ...state.unresolvedClaims.slice(0, 3),
  ].filter(Boolean).join(' | '), 1800);
}

export function detectExplicitCorrection(input) {
  return /\b(?:no[,—-]|that(?:'s| is) not what i (?:said|meant)|you (?:misread|misunderstood)|let me (?:correct|clarify)|i mean|rather)\b/i
    .test(input || '');
}

export function splitApprovedResponse(text, chunkSize = 180) {
  const source = typeof text === 'string' ? text.trim() : '';
  if (!source) return [];
  const chunks = [];
  let remaining = source;
  while (remaining.length > chunkSize) {
    let cut = remaining.lastIndexOf(' ', chunkSize);
    if (cut < Math.floor(chunkSize * 0.55)) cut = chunkSize;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
