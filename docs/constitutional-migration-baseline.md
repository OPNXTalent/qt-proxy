# Constitutional Migration — Sprint 1 Baseline

**Captured:** immediately before Sprint 1 (module wiring) changes, on branch `sprint-1-module-wiring`.
**Baseline commit:** `fc264a974abcf78a48fbf9d396978980bf299419` ("Update interpret.js", 2026-07-20)
**Repository verified against dossier:** identical — a fresh clone of `main` was byte-for-byte diffed against the copy used to compile `prism-os-constitutional-architecture-dossier.md`; no drift found.

## Prompt Measurement

- `PRISM_SYSTEM_PROMPT` template literal: `api/interpret.js` lines 12–1914.
- Characters: **140,778**
- Words: **20,384**
- Estimated tokens (chars/4, same methodology as the dossier): **~35,194**
- `api/interpret.js` total: **5,979 lines / 404,330 characters**

## Module Import Status (pre-change)

| Module | Imported? | Active in prompt assembly? |
|---|---|---|
| `theodicy.js` | Yes (line 10) | Yes — conditionally appended at both call sites (lines 5681, 5878) via `shouldLoadTheodicyModule()` |
| `response-refresh.js` | **No** | No — orphaned |
| `output-contract.js` | **No** | No — orphaned |
| `relational-salvation.js` | **No** | No — orphaned |

## Orphaned Module Count: 3

## Inline Sections Under Review for Sprint 1

| Section | Lines | Candidate replacement |
|---|---|---|
| Constitutional Response Principles | 1406–1417 | `response-refresh.js` |
| Demonstrate, Don't Explain | 1573–1600 | `response-refresh.js` |
| Relational Calibration & Active Listening | 1601–1707 | `response-refresh.js` |
| Voice, Posture & Register Calibration | 1708–1729 | `response-refresh.js` |
| Output Format — Non-Negotiable | 1779–1809 | `output-contract.js` |

## Verified Field-Level Diff: Inline Output Format vs. `output-contract.js`

Fields present in both: `response_mode`, `recognition`, `core_insight`, `suggested_threads`, `verse_identified`, `verse_text`, `orientation_question`, `prism_summary`, `entanglement`, `coherence_alignment`, `noise_decoherence`, `telos_insight`, `olam_haba`, `key_terms` (with `term`/`hebrew`/`prism_meaning`), `kingdom_implication`, `thread_summary`.

**One field exists only in `output-contract.js`: `interpretive_context`.** Cross-checked against `qt.html` (lines 3368–3369): the frontend already contains live rendering code for `interpretive_context` (a "qt-interpretive-context" div), which currently has no data to render because the backend has never emitted this field. Wiring `output-contract.js` in as designed will activate an already-shipped, currently-inert frontend feature rather than introduce new, unreviewed behavior.

## Test Infrastructure Status (pre-fix)

- `tests/test-theodicy-gate.mjs`: **broken.** Import path `'./lib/prompt-modules/theodicy.js'` does not resolve from either the repo root or the `tests/` directory (correct path is `'../lib/prompt-modules/theodicy.js'`). The test could not execute at all prior to this baseline capture — exit code 1, `ERR_MODULE_NOT_FOUND`.
- `tests/test-relational-salvation-gate.mjs`: runs successfully (25/25 passed), but — per its own header comment — hand-copies the gate function `shouldLoadRelationalSalvation()` rather than importing it from production code. **No such function currently exists anywhere in `api/interpret.js`** — confirmed via repository-wide search. This means `relational-salvation.js` is not merely unimported; there is currently no gate logic in production for it at all.

## Baseline Test Results (after minimal import-path correction)

The theodicy test's import path was corrected as the smallest necessary fix to make it exercise real production code (per the governing implementation rules — this is a test-infrastructure correction, not a Sprint 1 constitutional change, and is committed separately).

- `test-theodicy-gate.mjs`: **36/36 passed** (25 gate-classification cases + 11 prompt-composition checks against the real imported module).
- `test-relational-salvation-gate.mjs`: **25/25 passed** (tests the hand-copied gate function only; does not touch production code, since no production gate exists yet).

## Syntax Check

`node --check api/interpret.js`: **passed** (pre-change).

## Output Contract Shape (pre-change, as emitted by the live inline section)

18 top-level fields: `response_mode`, `recognition`, `core_insight`, `suggested_threads`, `verse_identified`, `verse_text`, `orientation_question`, `prism_summary`, `entanglement`, `coherence_alignment`, `noise_decoherence`, `telos_insight`, `olam_haba`, `key_terms`, `kingdom_implication`, `thread_summary` (16 fields; `key_terms` contains nested `term`/`hebrew`/`prism_meaning`).

No secrets, environment variables, or credentials are recorded in this document.
