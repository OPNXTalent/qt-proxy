# Constitutional Addition — The Closing Question
## core_insight closing-question requirement, and removal of suggested_threads

**Branch:** `posture-field-addition` (same branch as the Posture Field, continued)
**Commits:** `52f1687` (closing-question requirement added), `583d4bb` (suggested_threads removed)

## What this is

Two decisions, made together, that followed directly from testing the Posture Field live: a screenshot confirmed that `suggested_threads` — where every closing question in every capture that night had actually lived — renders behind a "Follow-Up Queries" button that is collapsed by default and was never once observed open across the entire project. Separately, reviewing every `recognition` field captured surfaced a reusable pattern: the opening of every response finds the real question underneath the person's stated one, using their own specific words. The decision was to require `core_insight` to do the same move in reverse — find the real question the response's own content now raises — and to require it land somewhere that actually renders, rather than behind a click nobody was taking.

Once that was in place, `suggested_threads`' original purpose (inviting further engagement) was judged redundant with a mechanism people would actually see, and it was removed outright rather than left in place as a second, unseen, costly copy of the same job.

## What changed

**`output-contract.js`** (always loaded, every request):
- `core_insight`'s field definition now requires a specific, non-generic closing question — answerable only given what that particular response said, not swappable onto a different one. Uses the contract's own existing Wrong/Right convention: *Wrong: "Want to go there?" "Worth exploring further?" Right: "What does that moment feel like for you?"*
- `suggested_threads` removed from the schema entirely.

**`interpret.js`**:
- The Thread Completion Protocol's now-moot "suggested_threads and thread_summary are mutually exclusive" instruction removed (nothing left to be mutually exclusive with).
- `saveThread()`'s dead `suggested_threads` line removed from the persisted slim snapshot.

**`theodicy.js`**:
- Move 9 (Posture Field) revised to state its trust question as one specific instance of the general closing-question rule, rather than independently duplicating a placement instruction.

**`qt.html`** — deliberately untouched. Its existing fallback (`Array.isArray(d.suggested_threads) ? ... : []`) already defaults to an empty array, so the "Follow-Up Queries" button simply stops appearing once nothing populates it. No frontend change was required for correctness.

## What was traded away

`suggested_threads` was a genuine, working feature, not dead text — each thread was a clickable button (`submitSuggestedThread()`) that submitted the thread as a new query with one click. That mechanism is gone now, not just hidden. It had never been used in anything tested across this project, but it did function. This was a deliberate, informed trade, not an oversight.

## Measured result — full picture across both changes

| | Before | After closing-question added | After suggested_threads removed |
|---|---|---|---|
| `output-contract.js` (always loaded) | 1,619 tokens | 1,884 tokens | **1,648 tokens** |

Net prompt-side effect of both changes together: **+29 tokens** on the always-loaded file — close to neutral. The more consequential effect is on the completion/output side, which drives actual generation latency more directly than prompt tokens do: removing `suggested_threads` eliminates roughly 170 completion tokens per response (measured on one real capture) that used to go toward generating 2–3 threads nobody was seeing, against maybe 20–40 completion tokens added by the new closing-question sentence. Net effect on generation cost is favorable, though this is token arithmetic, not a measured wall-clock result — no live-model access was available to confirm actual latency change.

`interpret.js`'s base prompt also dropped slightly: 33,517 → 33,476 tokens, from removing the stale mutual-exclusivity instruction.

## Regression

- All three files: `node --check` passes
- `test-theodicy-gate.mjs`: 36/36 pass, including the token-size assertion (~2,680 tokens, inside the enforced 1,800–3,000 range)
- `test-relational-salvation-gate.mjs`: 25/25, unaffected

No live-model validation was possible in this environment.

## Known open item, not resolved in this round

The existing "Doorway vs. Destination" framework (governs follow-up turns only) says a real Destination — a landed recognition — should end without a question, since a question interrupts recognition still arriving. Checking actual follow-up captures shows this rule isn't reliably holding even where it already applies. The new `core_insight` closing-question requirement was written without any Destination-style exception at all, meaning the first message now has the same gap the follow-up rule was supposed to close but doesn't always. Named and left open rather than fixed in this round.

## Status

Committed to the sandbox, verified clean. Applied to the live repository via the GitHub website, same process as every prior change.
