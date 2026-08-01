const STATE_SCHEMA_VERSION = 1;
const MAX_LIST_ITEMS = 8;
const MAX_TRAJECTORY_ITEMS = 10;
const MAX_TEXT_LENGTH = 500;

export const INQUIRY_RUNTIME_LIMITS = Object.freeze({
  stateChars: 16000,
  reducerOutputChars: 12000,
  analysisChars: 12000,
  ragItemChars: 2200,
  ragTotalChars: 9000,
  followupPromptChars: 48000,
  establishedGroundItems: 8,
  unresolvedClaimItems: 8,
  activeAssumptionItems: 8,
  trajectoryItems: 10,
});

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

function cleanStringList(value, limit = MAX_LIST_ITEMS, maxText = 320) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => cleanText(item, maxText)).filter(Boolean))].slice(0, limit);
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

  let trajectory = Array.isArray(candidate.inquiryTrajectory)
    ? candidate.inquiryTrajectory
      .map(item => ({
        turn: Math.max(1, Math.floor(Number(item?.turn) || 1)),
        change: cleanText(item?.change, 180),
        confidence: cleanConfidenceEntry(item?.confidence, {
          level: 'inferred',
          score: 0.6,
        }),
      }))
      .filter(item => item.change)
    : [];
  if (trajectory.length > MAX_TRAJECTORY_ITEMS) {
    const older = trajectory.slice(0, trajectory.length - (MAX_TRAJECTORY_ITEMS - 1));
    const recent = trajectory.slice(-(MAX_TRAJECTORY_ITEMS - 1));
    trajectory = [{
      turn: older.at(-1)?.turn || 1,
      change: cleanText(
        `Earlier movement: ${older.map(item => item.change).join('; ')}`,
        180,
      ),
      confidence: { level: 'tentative', score: 0.5 },
    }, ...recent];
  }

  const state = {
    schemaVersion: STATE_SCHEMA_VERSION,
    version: Math.max(0, Math.floor(Number(candidate.version) || 0)),
    turn: Math.max(0, Math.floor(Number(candidate.turn) || 0)),
    orientation: cleanText(candidate.orientation) || base.orientation,
    establishedGround: cleanStringList(candidate.establishedGround, 8, 320),
    unresolvedClaims: cleanStringList(candidate.unresolvedClaims, 8, 320),
    activeAssumptions: cleanStringList(candidate.activeAssumptions, 8, 260),
    constraintStatus: cleanConstraintStatus(candidate.constraintStatus, base.constraintStatus),
    falsifiabilityIssues: cleanStringList(candidate.falsifiabilityIssues, 6, 260),
    dominantDrift: cleanText(candidate.dominantDrift, 300) || null,
    lastStructuralChange: cleanText(candidate.lastStructuralChange, 300) || null,
    activeFrameworkSections: cleanStringList(candidate.activeFrameworkSections, 6, 120),
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
  if (JSON.stringify(state).length > INQUIRY_RUNTIME_LIMITS.stateChars) {
    throw new Error('INQUIRY_STATE_OVERSIZED');
  }
  return state;
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
      activeAssumptions: cleanStringList(gate.activeAssumptions, 6),
      unsupportedAssumptions: cleanStringList(gate.unsupportedAssumptions, 6),
      unfalsifiableClaims: cleanStringList(gate.unfalsifiableClaims, 6),
      logicalClosure: gate.logicalClosure || 'open',
      falsifiabilityStatus: gate.falsifiabilityStatus || 'not_applicable',
      relevantConstraints: cleanStringList(gate.relevantConstraints, 4, 40),
      retrieval: {
        needed: Boolean(gate.retrieval?.needed),
        focus: cleanText(gate.retrieval?.focus, 500),
      },
      questionNeeded: Boolean(gate.questionNeeded),
      endingMode: gate.endingMode || 'declarative',
      draftPreparation: cleanText(gate.draftPreparation, 500),
    },
    changedStateFields: cleanStringList(candidate?.changedStateFields, 10, 60),
    statePatch: patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {},
  };
}

export function validateAnalysisStrict(candidate, rawText = '') {
  if (typeof rawText === 'string'
    && rawText.length > INQUIRY_RUNTIME_LIMITS.reducerOutputChars) {
    throw new Error('REDUCER_OUTPUT_OVERSIZED');
  }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error('GATE_SCHEMA_INVALID');
  }
  const reducer = candidate.reduction;
  const gate = candidate.constraintGate;
  if (!reducer || typeof reducer.primaryProposition !== 'string'
    || !reducer.primaryProposition.trim()) {
    throw new Error('PRIMARY_PROPOSITION_MISSING');
  }
  if (typeof candidate.structuralDelta !== 'string'
    || !candidate.structuralDelta.trim()) {
    throw new Error('STRUCTURAL_DELTA_MISSING');
  }
  for (const field of [
    'observations',
    'inferences',
    'evidenceBoundaries',
    'activeAssumptions',
    'unsupportedAssumptions',
    'unfalsifiableClaims',
    'relevantConstraints',
  ]) {
    if (!Array.isArray(gate?.[field])) throw new Error(`GATE_FIELD_INVALID:${field}`);
  }
  if (!new Set(['open', 'supported', 'unsupported', 'contradictory'])
    .has(gate.logicalClosure)) {
    throw new Error('LOGICAL_CLOSURE_INVALID');
  }
  if (!new Set(['testable', 'partially_testable', 'unfalsifiable', 'not_applicable'])
    .has(gate.falsifiabilityStatus)) {
    throw new Error('FALSIFIABILITY_STATUS_INVALID');
  }
  const constraintValues = new Set([
    'ontological',
    'logical',
    'phenomenological',
    'relational',
  ]);
  if (!gate.relevantConstraints.length
    || gate.relevantConstraints.some(value => !constraintValues.has(value))) {
    throw new Error('RELEVANT_CONSTRAINTS_INVALID');
  }
  if (typeof gate.retrieval?.needed !== 'boolean'
    || typeof gate.retrieval?.focus !== 'string') {
    throw new Error('RETRIEVAL_CONTRACT_INVALID');
  }
  if (typeof gate.questionNeeded !== 'boolean') throw new Error('QUESTION_NEEDED_INVALID');
  if (!['declarative', 'interrogative'].includes(gate.endingMode)) {
    throw new Error('ENDING_MODE_INVALID');
  }
  if (gate.questionNeeded !== (gate.endingMode === 'interrogative')) {
    throw new Error('GATE_ENDING_CONTRADICTION');
  }
  if (!Array.isArray(candidate.changedStateFields)) {
    throw new Error('CHANGED_STATE_FIELDS_INVALID');
  }
  const patch = candidate.statePatch;
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('STATE_PATCH_INVALID');
  }
  const allowedPatchFields = new Set([
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
  const patchFields = Object.keys(patch);
  if (patchFields.some(field => !allowedPatchFields.has(field))) {
    throw new Error('STATE_PATCH_FIELD_INVALID');
  }
  const changed = new Set(candidate.changedStateFields);
  if (patchFields.some(field => field !== 'trajectoryChange' && !changed.has(field))) {
    throw new Error('STATE_PATCH_CHANGESET_MISMATCH');
  }
  const validated = validateAnalysis(candidate);
  if (JSON.stringify(validated).length > INQUIRY_RUNTIME_LIMITS.analysisChars) {
    throw new Error('GATE_OUTPUT_OVERSIZED');
  }
  return validated;
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
6. Set questionNeeded true only when ambiguity or missing information prevents a responsible comment. endingMode must agree.

Compactness contract:
- Keep the complete JSON response under 6,000 characters.
- Use at most 3 entries per array and at most 160 characters per entry.
- Use short propositions, not explanatory paragraphs.
- Use empty arrays when a category has no material finding; do not manufacture findings to fill the schema.

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
    "activeAssumptions": [],
    "unsupportedAssumptions": [],
    "unfalsifiableClaims": [],
    "logicalClosure": "open",
    "falsifiabilityStatus": "not_applicable",
    "relevantConstraints": ["logical"],
    "retrieval": {"needed": false, "focus": ""},
    "questionNeeded": false,
    "endingMode": "declarative",
    "draftPreparation": ""
  },
  "changedStateFields": [],
  "statePatch": {
    "trajectoryChange": ""
  }
}`;
}

export function buildDraftPrompt({ state, analysis, input, retrievedContext = '' }) {
  const draftAnalysis = {
    reduction: analysis.reduction,
    structuralDelta: analysis.structuralDelta,
    constraintGate: analysis.constraintGate,
    changedStateFields: analysis.changedStateFields,
  };
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
${JSON.stringify(draftAnalysis)}

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
    analysis.constraintGate?.retrieval?.focus,
    analysis.reduction.primaryProposition,
    ...analysis.reduction.supportingPropositions,
    state.orientation,
    ...state.unresolvedClaims.slice(0, 3),
  ].filter(Boolean).join(' | '), 1800);
}

export function boundRetrievedContext(rawContext) {
  if (typeof rawContext !== 'string' || !rawContext) {
    return { context: '', compacted: false, originalChars: 0 };
  }
  const originalChars = rawContext.length;
  const marker = /(?=\[Retrieved \d+\s*\|)/g;
  const firstMarker = rawContext.search(marker);
  if (firstMarker < 0) {
    const context = rawContext.slice(0, INQUIRY_RUNTIME_LIMITS.ragTotalChars);
    return { context, compacted: context.length < originalChars, originalChars };
  }
  const prefix = rawContext.slice(0, firstMarker).slice(0, 1000);
  const items = rawContext.slice(firstMarker).split(marker)
    .filter(Boolean)
    .map(item => item.slice(0, INQUIRY_RUNTIME_LIMITS.ragItemChars));
  let context = prefix;
  for (const item of items) {
    const separator = context ? '\n\n' : '';
    const remaining = INQUIRY_RUNTIME_LIMITS.ragTotalChars
      - context.length - separator.length;
    if (remaining <= 0) break;
    context += separator + item.slice(0, remaining);
  }
  return { context, compacted: context.length < originalChars, originalChars };
}

export function assertFollowUpPromptSize(prompt) {
  if (typeof prompt !== 'string'
    || prompt.length > INQUIRY_RUNTIME_LIMITS.followupPromptChars) {
    throw new Error('FOLLOWUP_PROMPT_OVERSIZED');
  }
  return prompt;
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
