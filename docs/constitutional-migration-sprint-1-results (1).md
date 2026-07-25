# Constitutional Migration — Sprint 1 Results

**Branch:** `sprint-1-module-wiring`
**Base commit:** `fc264a974abcf78a48fbf9d396978980bf299419`
**Sprint commits:** `f5d4271` (baseline), `39bb083` (wiring), `800eee4` (test correction)

## Measurements

| | Before | After | Change |
|---|---|---|---|
| `PRISM_SYSTEM_PROMPT` chars | 140,778 | 134,249 | −6,529 |
| `PRISM_SYSTEM_PROMPT` words | 20,384 | 19,162 | −1,222 |
| `PRISM_SYSTEM_PROMPT` est. tokens (chars/4) | ~35,194 | ~33,562 | **−1,632 (−4.6%)** |
| `api/interpret.js` total lines | 5,979 | 6,001 | +22 |
| `api/interpret.js` total bytes | 404,330 | 399,140 | −5,190 |
| Orphaned prompt modules | 3 | **0** | −3 |
| Duplicated inline sections removed | — | 2 (Output Format, Voice/Posture) | — |

The line count went *up* slightly even though the assembled prompt shrank — the new gate function (~70 lines) and call-site wiring outweigh the ~75 lines of deleted inline text. This is expected and correct: source-file line count and assembled-prompt size are different things, and Step 6 asked for both to be reported separately rather than conflated.

**This is a smaller reduction than the dossier projected (~5,000 tokens) for this sprint**, and that gap is the most important finding of this sprint, not an error to paper over — see below.

## The finding that changed scope mid-sprint

The dossier's Part III/IV assumed four inline sections (Constitutional Response Principles, Demonstrate Don't Explain, Relational Calibration & Active Listening, Voice/Posture & Register Calibration) were all superseded by `response-refresh.js`, based on that module's own header comment claiming it "replaces overlapping voice, posture, and response-principle instructions."

Reading all four in full, side-by-side against `response-refresh.js`'s actual eight points, before deleting anything:

| Section | Verdict | Reason |
|---|---|---|
| Voice, Posture & Register Calibration | **Fully superseded** | Near-verbatim overlap: "accept corrections immediately," "match register without announcing it," "land, offer, stop" all map directly onto response-refresh.js points 4, 6, 8. **Deleted.** |
| Output Format | **Fully superseded** | Verified field-by-field identical except one addition (`interpretive_context`), which the frontend already expects. **Deleted.** |
| Constitutional Response Principles | **Partially superseded — retained** | "Recognition Before Explanation" and "One Door at a Time" (progressive multi-turn disclosure) are not restated anywhere in response-refresh.js. |
| Demonstrate, Don't Explain | **Partially superseded — retained** | The core "don't narrate the framework" principle is echoed in response-refresh.js's preamble, but the specific prohibited-phrase list (`"The framework asks..."`, `"Through the lens of..."`, etc.) and the "Plain Language Test" are not. |
| Relational Calibration & Active Listening | **Distinct — retained** | The bulk of this section (Wound Taxonomy: intellectual skepticism / institutional disappointment / betrayal / spiritual abuse / trauma; Posture Discernment; Moral Clarity for Violation; Disentanglement Moves; the Recognition→Discernment→Disentanglement→Reorientation arc) has **no counterpart anywhere in response-refresh.js**. This is the largest of the four sections and the one where deleting on the strength of the header comment alone would have silently removed real, safety-adjacent pastoral content. |

This directly explains the token gap: the dossier's projection assumed all four would go; only one of the four (plus the separately-confirmed Output Format) actually qualified. The other three are flagged here for a future, deliberate decision — either write genuinely new consolidated content that covers what they cover, or formally reclassify them as permanently independent — rather than silently resolved in this sprint.

## A second finding: `relational-salvation.js` had no gate in production at all

Not merely unimported — there was no `shouldLoadRelationalSalvation()` anywhere in `api/interpret.js` prior to this sprint, only a hand-copied version in its test file. This sprint added the function (exported, logic ported verbatim from the already-validated 25-case test) and wired it at both call sites, matching the theodicy pattern exactly.

## A third finding: the theodicy test literally could not run

`tests/test-theodicy-gate.mjs`'s import path was broken (`./lib/...` instead of `../lib/...`) and crashed with `ERR_MODULE_NOT_FOUND` regardless of working directory. Fixed as the minimal correction needed to establish a trustworthy baseline (committed separately, before any Sprint 1 wiring work, per the baseline-first instruction).

## Regression Results

| Check | Result |
|---|---|
| `node --check api/interpret.js` | **Pass** |
| `test-theodicy-gate.mjs` | **36/36 pass** (unchanged from baseline) |
| `test-relational-salvation-gate.mjs` | **25/25 pass** — now against the real, exported production function instead of a hand-copied duplicate |
| Each module imported exactly once | **Confirmed** (grep count = 1 for all four) |
| `output-contract.js` / `response-refresh.js` interpolated exactly once each | **Confirmed** |
| `theodicy.js` / `relational-salvation.js` present at both call sites, gated | **Confirmed** |
| No duplicate JSON-schema text remaining in `interpret.js` | **Confirmed** (grep for the old inline schema's opening line returns nothing) |
| No duplicate "MODEL REFRESH" header remaining | **Confirmed** |
| `qt.html` / legacy `buildPrompt()` | Unaffected — confirmed out of scope (client-side only, no interaction with the server-side changes made this sprint) |

No live-model regression run was performed — that would require `ANTHROPIC_API_KEY` and paid API access not available in this environment. All validation above is local (syntax, import resolution, gate-logic unit tests, content-level diffing). This limitation is stated here rather than implied; no live-model results are reported because none were run.

## Sections Removed

| Section | Lines (baseline) | Replacement |
|---|---|---|
| Output Format — Non-Negotiable | 1779–1809 | `${PRISM_OUTPUT_CONTRACT}` |
| Voice, Posture & Register Calibration | 1708–1729 | `${PRISM_RESPONSE_REFRESH}` |

## Sections Retained (suspected duplicates that were not deleted)

Constitutional Response Principles, Demonstrate Don't Explain, and Relational Calibration & Active Listening — all three retained in full. Reasons given individually above. This is a deliberate, evidence-based exception to the dossier's original projection, not an oversight.

## Risks / Open Items

- The three retained sections above still need a future decision: write new consolidated content, or formally accept them as independent. Not resolved here.
- `test-theodicy-gate.mjs` still hand-copies its gate-classification logic (only the module-content import was broken and is now fixed) — the deeper drift risk the dossier flagged remains, deliberately not addressed in this sprint to avoid a broad test-suite redesign.
- No live-model validation was possible in this environment.

## Git Summary

- **Branch:** `sprint-1-module-wiring`
- **Commits:** `f5d4271` (test fix + baseline), `39bb083` (module wiring + section removal), `800eee4` (test correction)
- **Files changed:** `api/interpret.js`, `tests/test-theodicy-gate.mjs`, `tests/test-relational-salvation-gate.mjs`, `docs/constitutional-migration-baseline.md` (new)
- **Working tree:** clean as of this report; all changes committed

## Sprint 1 Decision

**Sprint 1 complete and ready for review.**

All three approved modules are imported, active, and appear exactly once. Superseded inline content was removed only where verified as fully superseded. Uncertain content was retained, not deleted, with evidence documented for each retained section. All available regression checks pass. Constitutional Authority, Emet, and Article II were not touched. Do not proceed to Sprint 2 until this is reviewed.
