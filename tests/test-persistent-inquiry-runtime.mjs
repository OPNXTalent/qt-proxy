import assert from 'node:assert/strict';
import {
  applyInquiryPatch,
  buildReducerPrompt,
  buildFocusedRetrievalQuery,
  createInitialInquiryState,
  detectExplicitCorrection,
  parseModelJson,
  splitApprovedResponse,
  validateAnalysis,
  validateAnalysisStrict,
  validateInquiryState,
} from '../lib/persistent-inquiry-runtime.js';

const initial = createInitialInquiryState('Whether agency can survive prior causes');
assert.equal(initial.version, 0);
assert.equal(initial.turn, 0);
assert.equal(initial.inquiryTrajectory.length, 0);

const reducerPrompt = buildReducerPrompt({
  state: initial,
  input: 'But where does agency enter?',
});
assert.match(reducerPrompt, /under 6,000 characters/);
assert.match(reducerPrompt, /at most 3 entries per array/);

const analysis = validateAnalysis(parseModelJson(`\`\`\`json
{
  "reduction": {
    "primaryProposition": "Agency has not been located independently of prior causes.",
    "supportingPropositions": ["Influence and determination may be assumed distinctions."],
    "rhetoricalLanguage": [],
    "emotionalLanguage": [],
    "examples": [],
    "narrative": null
  },
  "structuralDelta": "The inquiry moved from responsibility to the location of agency.",
  "constraintGate": {
    "observations": ["No independent component of agency has been identified."],
    "inferences": ["Agency therefore does not exist."],
    "evidenceBoundaries": ["Failure to locate agency is not proof of its absence."],
    "unsupportedAssumptions": [],
    "unfalsifiableClaims": [],
    "activeAssumptions": ["Causal dependence may entail determination."],
    "logicalClosure": "open",
    "falsifiabilityStatus": "partially_testable",
    "relevantConstraints": ["ontological", "logical"],
    "retrieval": {"needed": true, "focus": "agency and causal dependence"},
    "questionNeeded": false,
    "endingMode": "declarative",
    "draftPreparation": "Address the inference rather than repeat the original answer."
  },
  "changedStateFields": ["orientation", "unresolvedClaims", "confidence"],
  "statePatch": {
    "orientation": "Where agency enters a causally conditioned process",
    "unresolvedClaims": ["Whether causal dependence entails determination"],
    "trajectoryChange": "The inquiry shifted from moral responsibility to agency's ontology.",
    "confidence": {
      "orientation": {"level":"directly_established","score":0.93}
    }
  }
}
\`\`\``));

const next = applyInquiryPatch(initial, analysis.statePatch, analysis.structuralDelta);
assert.equal(next.turn, 1);
assert.equal(next.inquiryTrajectory.length, 1);
assert.match(next.orientation, /Where agency enters/);
assert.equal(next.confidence.orientation.level, 'directly_established');
assert.equal(next.version, 0, 'Patches must not manufacture a committed version');

assert.doesNotThrow(() => validateAnalysisStrict(analysis, JSON.stringify(analysis)));
const aliasedFalsifiability = validateAnalysisStrict({
  ...analysis,
  constraintGate: {
    ...analysis.constraintGate,
    falsifiabilityStatus: 'partially falsifiable',
  },
});
assert.equal(
  aliasedFalsifiability.constraintGate.falsifiabilityStatus,
  'partially_testable',
);
const aliasedConstraints = validateAnalysisStrict({
  ...analysis,
  constraintGate: {
    ...analysis.constraintGate,
    relevantConstraints: ['Ontology', 'LOGIC', 'relational coherence'],
  },
});
assert.deepEqual(
  aliasedConstraints.constraintGate.relevantConstraints,
  ['ontological', 'logical', 'relational'],
);
const inferredChangeSet = validateAnalysisStrict({
  ...analysis,
  changedStateFields: [],
});
assert.deepEqual(
  inferredChangeSet.changedStateFields.sort(),
  ['confidence', 'orientation', 'unresolvedClaims'].sort(),
);
const reducerEcho = validateAnalysisStrict({
  ...analysis,
  statePatch: {
    ...analysis.statePatch,
    version: 99,
    turn: 99,
    lastStructuralChange: 'model-controlled value',
    inquiryTrajectory: [{ turn: 99, change: 'model-controlled value' }],
  },
});
assert.equal(reducerEcho.statePatch.version, undefined);
assert.equal(reducerEcho.statePatch.turn, undefined);
assert.equal(reducerEcho.statePatch.lastStructuralChange, undefined);
assert.equal(reducerEcho.statePatch.inquiryTrajectory, undefined);
assert.throws(
  () => validateAnalysisStrict({
    ...analysis,
    statePatch: { ...analysis.statePatch, secretAuthority: true },
  }),
  /STATE_PATCH_FIELD_INVALID/,
);
assert.throws(
  () => validateAnalysisStrict({
    reduction: analysis.reduction,
    structuralDelta: analysis.structuralDelta,
    constraintGate: { observations: [] },
    changedStateFields: [],
    statePatch: {},
  }),
  /GATE_FIELD_INVALID/,
);
assert.throws(
  () => validateAnalysisStrict({
    ...analysis,
    constraintGate: {
      ...analysis.constraintGate,
      questionNeeded: true,
      endingMode: 'declarative',
    },
  }),
  /GATE_ENDING_CONTRADICTION/,
);
assert.throws(
  () => validateAnalysisStrict(analysis, 'x'.repeat(12001)),
  /REDUCER_OUTPUT_OVERSIZED/,
);

const patchedWithUnknownField = applyInquiryPatch(next, {
  secretAuthority: 'must not survive',
  dominantDrift: 'The claim exceeds the evidence',
}, 'Scrutiny moved to the evidence boundary');
assert.equal(patchedWithUnknownField.secretAuthority, undefined);
assert.equal(patchedWithUnknownField.turn, 2);

const corrupt = validateInquiryState({
  version: -10,
  turn: 'bad',
  establishedGround: Array(30).fill('Repeated'),
  confidence: { orientation: { level: 'certain', score: 8 } },
});
assert.equal(corrupt.version, 0);
assert.equal(corrupt.establishedGround.length, 1);
assert.equal(corrupt.confidence.orientation.level, 'tentative');
assert.equal(corrupt.confidence.orientation.score, 1);

assert.equal(detectExplicitCorrection("No—that isn't what I meant."), true);
assert.equal(detectExplicitCorrection('I agree with that distinction.'), false);

const query = buildFocusedRetrievalQuery(next, analysis);
assert.match(query, /Agency has not been located/);
assert.match(query, /Where agency enters/);

const chunks = splitApprovedResponse('A '.repeat(250), 100);
assert.ok(chunks.length > 1);
assert.equal(chunks.join('').trim(), 'A '.repeat(250).trim());

console.log('Persistent inquiry runtime unit checks passed.');
