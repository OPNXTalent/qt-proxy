import assert from 'node:assert/strict';
import {
  applyInquiryPatch,
  buildFocusedRetrievalQuery,
  createInitialInquiryState,
  detectExplicitCorrection,
  parseModelJson,
  splitApprovedResponse,
  validateAnalysis,
  validateInquiryState,
} from '../lib/persistent-inquiry-runtime.js';

const initial = createInitialInquiryState('Whether agency can survive prior causes');
assert.equal(initial.version, 0);
assert.equal(initial.turn, 0);
assert.equal(initial.inquiryTrajectory.length, 0);

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
    "draftPreparation": "Address the inference rather than repeat the original answer."
  },
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
