# Sprint 4 — Escalation Ladder Extraction — Results

## What changed

One file: `api/interpret.js`. One new section, two sections trimmed, one section deliberately left untouched.

**New:** `ESCALATION LADDER PROTOCOL` — a single canonical three-stage sequence, inserted right before `SESSION AUDIT`.

**Trimmed:** `SESSION AUDIT` and `BAD FAITH DETECTION & RESPONSE PROTOCOL` no longer restate the ladder. Each now defines only its own trigger condition and points to the shared protocol. Nothing about *when* either one fires changed — only that they stopped independently re-authoring *what happens once they do*.

**Untouched, confirmed byte-identical:** `DEHUMANIZING LANGUAGE PROTOCOL`. Its escalation sequence looks similar in shape but is genuinely different in substance — different trigger, different Stage 1/2 content (naming a dehumanization mechanism and grounding it in prophetic tradition, not redirecting a cycling question). Forcing it into the shared protocol would have cost real content for no real gain, so it was left alone. This was read in full before that decision was made, not assumed from the section header.

## Measured result

| | Before | After | Change |
|---|---|---|---|
| `PRISM_SYSTEM_PROMPT` chars | 134,556 | 133,610 | −946 |
| `PRISM_SYSTEM_PROMPT` words | 19,193 | 19,026 | −167 |
| `PRISM_SYSTEM_PROMPT` est. tokens (chars/4) | ~33,639 | ~33,402 | **−237 (−0.7%)** |
| `api/interpret.js` total lines | 6,008 | 5,993 | −15 |

A real, clean reduction this time — unlike Sprint 2, this genuinely was duplicated text, not two distinct articulations that had to both survive.

## Regression

- `node --check api/interpret.js`: pass
- `test-theodicy-gate.mjs`: 36/36 pass, unchanged
- `test-relational-salvation-gate.mjs`: 25/25 pass, unchanged
- Dehumanizing Language Protocol: byte-for-byte diffed against pre-change — identical

No live-model validation was possible in this environment, same limitation as every prior sprint.

## How to apply this

Same process as `interpret.js` in Sprint 1: one file, full replace, through the GitHub website.

1. Go to `api/interpret.js` in your repo.
2. Click the pencil icon to edit.
3. Select all (Ctrl+A), delete.
4. Open the attached `interpret.js`, select all, copy, paste into GitHub's editor.
5. Before committing, same three-spot check as last time — top of the file, the import block, and the very bottom — to confirm nothing got cut off in the paste.
6. Commit message: something like `Sprint 4: extract shared Escalation Ladder Protocol`.

I'll do the same fresh-clone verification afterward that I did for Sprints 1 and 2 — re-clone your actual repo once you've committed, and confirm syntax and both gate tests pass against what's really on GitHub.
