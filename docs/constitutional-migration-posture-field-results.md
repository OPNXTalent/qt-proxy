# Constitutional Addition — The Posture Field
## Move 9, Theodicy Module

**Branch:** `posture-field-addition` (off the live post-Sprint-5 state, commit `0f2c578`)
**Commit:** `18d50c4`

## What this is, and how it differs from Sprints 1–5

Every prior change to this system — the module wiring, the Constitutional Authority and Emet consolidation, the Escalation Ladder extraction, the Recognition-Landing extraction — consolidated content that already existed somewhere in the constitutional prompt. This is the first genuinely new constitutional content added since the migration began. It came out of an extended conversation working through how a theodicy-pressure response should close for someone in real grief, rather than from finding and merging existing duplicated text.

## What was added

**Move 9 — The Posture Field**, appended to `lib/prompt-modules/theodicy.js` after Move 8 (Scientific Corroboration). A closing move for the theodicy protocol, not a replacement for any existing move:

- Fires only after Moves 1–6 have delivered the core theodicy content and it has had room to land — never as a first move, never in place of engaging the question.
- Holds that every person facing this question already occupies one of four postures: self-reliance, indictment of God, materialism, or trust beyond certainty. Silence or avoidance counts as unstated occupancy of one of these, not a neutral position outside them.
- Never presumes or corrects which seat a person is in. A stated indictment of God stands, unargued — grounded directly in the text: God's rebuke at the end of Job falls on the friends, who defended His character, not on Job, whose indictment ran through most of the book.
- Closes with one question, deliberately object-agnostic — *where does your trust actually stand* — that reaches all four postures identically, since it never specifies what the trust is placed in. The person's answer reveals the object; the question doesn't presuppose one.
- Explicitly subordinate to Move 7 (Direct Answer Compliance): if a person has already named that a question was substituted for an answer, that rule governs and Move 9 does not fire.

## Where it lives, and why

Inside the conditionally-loaded theodicy module, not the always-on base prompt. Move 9 depends on content (Job, Isaiah 45:7, Genesis 50:20) that only exists when this module is already loaded — putting it in the base prompt would mean paying its token cost on every request regardless of relevance. It only costs anything on the queries where it's actually applicable.

## Measured result

| | Before | After |
|---|---|---|
| Theodicy module size | ~2,091 tokens | ~2,597 tokens |

The existing `test-theodicy-gate.mjs` enforces a 1,800–3,000 token range for this module. That constraint was checked *before* drafting Move 9, not discovered after — it was written to fit the existing budget rather than exceeding it and needing a trim.

## Regression

- `node --check lib/prompt-modules/theodicy.js`: pass
- `test-theodicy-gate.mjs`: 36/36 pass, including the token-size assertion (now ~2,597, inside range)
- `test-relational-salvation-gate.mjs`: 25/25, unaffected
- `api/interpret.js`: untouched — this change is scoped entirely to the theodicy module

No live-model validation was possible in this environment. Re-running Benchmark 7 (Personal Suffering: *"My child died and I don't understand why God allowed it"*) after this ships, as a fresh session, is the natural way to see Move 9 actually function — the original Benchmark 7 capture predates this addition.

## Status

Committed to the sandbox, verified clean. Applied to the live repository via the GitHub website, same process as every prior change.
