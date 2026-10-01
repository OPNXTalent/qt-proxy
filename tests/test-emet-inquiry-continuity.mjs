import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRISM_EMET_COVENANT_INQUIRY } from '../lib/prompt-modules/emet-covenant-inquiry.js';
import { shouldLoadCovenantalRestoration } from '../lib/prompt-modules/prism-covenantal-restoration.js';
import { buildDraftPrompt, buildAuditPrompt, createInitialInquiryState, assertFollowUpPromptSize } from '../lib/persistent-inquiry-runtime.js';

// A real follow-up must carry the same compact governing layer as the initial
// inquiry, including when no retrieved source passages are available.
const state = createInitialInquiryState('Why create people whose rejection is known?');
const analysis = { reduction: { primaryProposition: 'God foreknows rejection' }, structuralDelta: 'Foreknowledge, not merely hell', constraintGate: {}, changedStateFields: [] };
const prompt = buildDraftPrompt({ state, analysis, input: 'Honestly it is the people God created knowing they would choose hell.' });
assert.ok(prompt.includes(PRISM_EMET_COVENANT_INQUIRY));
assertFollowUpPromptSize(prompt);
const api = readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const initial = api.slice(api.indexOf('const PRISM_SYSTEM_PROMPT'), api.indexOf('CONVERSATIONAL REALITY'));
assert.ok(initial.includes('${PRISM_EMET_COVENANT_INQUIRY}'));
const fallback = api.slice(api.indexOf('async function runDisabledFollowUpFallback'), api.indexOf('async function restoreCanonicalInquiryState'));
assert.match(fallback, /system: PRISM_RESPONSE_REFRESH \+ PRISM_QUANTUM_FINGERPRINT \+ PRISM_EMET_COVENANT_INQUIRY/);
assert.match(api, /prompt: draftPrompt,\s+system: PRISM_RESPONSE_REFRESH \+ PRISM_QUANTUM_FINGERPRINT/);
assert.ok(buildAuditPrompt({ input: 'Show the evidence', analysis, draft: 'A connected reading.' }).includes('not repeated disclaimer paragraphs or a forced conclusion'));
for (const input of ['Emet and tav', 'Gethsemane', 'He was made sin', 'Psalm 22', 'Genesis 15']) {
  assert.equal(shouldLoadCovenantalRestoration(input), true, input);
}
assert.equal(shouldLoadCovenantalRestoration('How much is a tire rotation?'), false);
// The shared guidance must fit within the existing bounded runtime without
// raising limits or truncating inquiry state/retrieval to make room for it.
state.establishedGround = Array(8).fill('a'.repeat(320));
state.unresolvedClaims = Array(8).fill('b'.repeat(320));
state.activeAssumptions = Array(8).fill('c'.repeat(320));
state.inquiryTrajectory = Array.from({ length: 10 }, (_, i) => ({ turn: i, change: 'd'.repeat(300), confidence: { level: 'inferred', score: 0.7 } }));
const bounded = buildDraftPrompt({ state, analysis, input: 'e'.repeat(4000), retrievedContext: 'f'.repeat(14000) });
assertFollowUpPromptSize(bounded);
console.log('Emet initial/follow-up/fallback continuity, routing, and prompt budget checks passed.');
