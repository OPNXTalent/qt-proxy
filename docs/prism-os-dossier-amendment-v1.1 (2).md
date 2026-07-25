# Constitutional Amendment 1 — Sprint 1 Reconciliation
## (Version 1.1)

**Status:** The dossier (Parts I–VIII) remains the governing specification. This amendment does not redesign it — it corrects the specific statements Sprint 1's implementation evidence disproved, updates every token projection to measured data, and leaves everything Sprint 1 didn't touch unchanged. Axioms 1 and 2 are not revisited. No new philosophical concepts are introduced. No section is compressed here merely to recover token count.

---

## 1. Executive Amendment Summary

Sprint 1 wired all three orphaned prompt modules (`response-refresh.js`, `output-contract.js`, `relational-salvation.js`) into production alongside the already-active `theodicy.js`, fixed two previously-unknown test-infrastructure bugs, and measured a real, verified reduction in the assembled system prompt.

**Confirmed by Sprint 1:**
- Three modules were genuinely orphaned (Part III's central finding) — confirmed exactly as described.
- `output-contract.js` and `response-refresh.js` do supersede real inline content — confirmed for two of the five sections examined.
- The general strategy of "wire first, delete only what's verified redundant" (Part VIII's own Sprint 1 design) worked exactly as intended and caught a real problem before it shipped.

**Disproven by Sprint 1:**
- The assumption that all four voice/posture/response-principle sections were superseded by `response-refresh.js`. Only one of the four was. The other three contain content — a progressive-disclosure sequencing rule, a specific prohibited-phrase list, and a substantial Wound Taxonomy / pastoral-safety framework — with no counterpart in the replacement module.
- The assumption that `relational-salvation.js` was "conditionally loaded" in the sense of already having a gate somewhere. It had no gate anywhere in production — only a hand-copied stand-in in its own test file.
- The "zero new authoring" framing applied to Sprint 1 as a whole (Part III, Section 0). It was accurate for `output-contract.js` and `response-refresh.js`'s wiring, but not for `relational-salvation.js`, which required writing (porting) a genuine new production function.

**Does this change the implementation roadmap?** Not its sequencing or dependencies — see Section 6. It changes projected outcomes (Section 3) and adds one new standing rule (Section 7) that will apply to every subsequent sprint's own verification work, most immediately Sprint 4's Escalation Ladder consolidation, which rests on the same kind of "the header comment says X, does the content actually say X" question that just proved consequential here.

---

## 2. Architectural Corrections

Only statements Sprint 1's evidence bears on. Everything else in Parts I–VIII stands as written.

---

**Original statement** (Part III, Replacement Ledger, Section 2 table): *"Constitutional Response Principles (1406–1417) — Delete — Superseded by `response-refresh.js` once actually imported."*
**Sprint 1 evidence:** Full-text comparison shows `response-refresh.js`'s eight points do not restate "Recognition Before Explanation" (always begin at the human/emotional level before the conceptual one) or "One Door at a Time" (progressive multi-turn disclosure, not resolving every layer in one response).
**Corrected statement:** Constitutional Response Principles — **Retain.** Contains two obligations with no counterpart in `response-refresh.js`. Not a deletion candidate absent new consolidated authorship.
**Reason for amendment:** The original classification relied on `response-refresh.js`'s own header comment describing its intended scope, not a verified line-by-line comparison. Sprint 1 performed that comparison as explicitly required by its own task specification (Part VIII, Sprint 1, "Required Comparison Before Deletion") and found the header's claim broader than the content delivers.

---

**Original statement** (Part III, Section 2 table; Part IV, Compression Ladder table): *"Relational Calibration & Active Listening (1601–1707) — Delete — Superseded by `response-refresh.js`."*
**Sprint 1 evidence:** This is the largest of the four sections (2,153 tokens per Part III's own measurement) and contains a Wound Taxonomy (intellectual skepticism / institutional disappointment / superiority through deconstruction / emotional alienation / moral disgust / betrayal / spiritual abuse / trauma / longing beneath cynicism), a Posture Discernment framework, Moral Clarity for Violation guidance, Disentanglement Moves, and a Recognition→Discernment→Disentanglement→Reorientation movement arc — none of which appears anywhere in `response-refresh.js`.
**Corrected statement:** Relational Calibration & Active Listening — **Retain, and reclassify from "duplicate" to "distinct."** This is not a compression opportunity at all; it was misidentified as one.
**Reason for amendment:** Same root cause as above — this is the single largest correction in this amendment, both in token terms and in stakes, since the content involved (spiritual abuse discernment, trauma-sensitivity) is safety-adjacent. Deleting it on the strength of a header comment would have been the most consequential error averted across all four phases of design work.

---

**Original statement** (Part IV, Compression Ladder table): *"Demonstrate, Don't Explain (1573–1600) — 2 — Merge candidate — Likely folds into `response-refresh.js`, per prior ledger's flag."*
**Sprint 1 evidence:** The core principle ("do not narrate the framework or announce internal classifications") is echoed in `response-refresh.js`'s preamble. The specific prohibited-phrase list (*"The framework asks..."*, *"Through the lens of..."*, etc.) and the "Plain Language Test" heuristic are not restated anywhere in the module.
**Corrected statement:** Demonstrate, Don't Explain — **Retain (partially superseded).** The Compression Audit's own original hedge — *"likely," not confirmed* — was correct to hedge. The hedge is now resolved: partial overlap confirmed, full supersession rejected.
**Reason for amendment:** This is the one place where Part IV's own epistemic caution (flagging this specific section as uncertain rather than a clean Delete, unlike the other three) is vindicated by the evidence. Recorded here so the distinction between "the process worked" (this section) and "the process's output was wrong and needed correcting" (the two sections above) doesn't get lost.

---

**Original statement** (Part III, Section 2 table; Part IV, Compression Ladder table): *"Voice, Posture & Register Calibration (1708–1729) — Delete — Superseded by `response-refresh.js`."*
**Sprint 1 evidence:** Confirmed. Near-verbatim overlap on multiple points ("accept corrections to the user's frame immediately and completely," "match the user's register without announcing the adjustment," the land/offer/stop closing pattern).
**Corrected statement:** No change. This classification was correct.
**Reason for amendment:** None — included here only for completeness, so the record shows one of the four original classifications was verified rather than silently assuming all four needed correction.

---

**Original statement** (Part III, Section 2 table: *"Output Format (1779–1809) — Delete from this file — Already duplicated by `lib/prompt-modules/output-contract.js`."*
**Sprint 1 evidence:** Confirmed, with one refinement: the two are not byte-identical. `output-contract.js` contains one additional field, `interpretive_context`, absent from the live inline version.
**Corrected statement:** No change to the deletion recommendation. **Addition:** cross-referencing `qt.html` (lines 3368–3369) shows the frontend already contains dead rendering code for `interpretive_context` — this field's absence in production was itself a pre-existing bug, and wiring `output-contract.js` in as designed fixes it as a side effect.
**Reason for amendment:** Strengthens the original finding with evidence the dossier didn't have — this wasn't discoverable without inspecting both the backend module and the frontend file together, which Sprint 1's explicit scope (*"qt.html, only to identify whether any output-contract or prompt-building duplication affects Sprint 1"*) required.

---

**Original statement** (Part III, Section 0): *"`relational-salvation.js`... is separately loaded... confirm whether the latter's name implies a gate already exists for this module... before assuming a straight splice."*
**Sprint 1 evidence:** No gate existed anywhere in `api/interpret.js`. `shouldLoadRelationalSalvation()` existed only as a hand-copied function inside `tests/test-relational-salvation-gate.mjs`, with that file's own header comment claiming it "mirrors interpret.js exactly" — a claim that was false, since there was nothing in `interpret.js` to mirror.
**Corrected statement:** `relational-salvation.js` was not merely orphaned in the sense the other two modules were (written, never imported). It was orphaned *and ungated* — a module whose entire raison d'être (firing only under specific triggers) had never been implemented in production at all.
**Reason for amendment:** This is stronger evidence of the same underlying pattern Part III's Section 0 identified (the "add beside rather than replace" failure mode) than the dossier itself had — it wasn't just that the replacement was never wired in, it's that the replacement's *precondition* for firing correctly never existed either.

---

**Original statement** (implicit throughout Parts I, III, VIII): the theodicy gate test was treated as a working, if imperfect, regression check — Part III's Section 0 and Part VIII's opening note both describe its risk as "hand-copying gate logic," implying it otherwise runs correctly.
**Sprint 1 evidence:** `test-theodicy-gate.mjs` could not execute at all prior to Sprint 1 — a broken relative import path (`./lib/...` instead of `../lib/...`) caused `ERR_MODULE_NOT_FOUND` regardless of working directory.
**Corrected statement:** The theodicy test's risk was understated, not overstated. It wasn't a partially-trustworthy check with a known blind spot; it was a completely non-functional check until Sprint 1's baseline-establishment step fixed it.
**Reason for amendment:** No part of the dossier could have known this without actually attempting to run the test, which none of Parts I–VII did — they analyzed the constitutional prompt, not the test harness's operational state. This is a finding entirely new to Sprint 1, not a correction of a prior claim.

---

## 3. Token Projection Revision

| Projection source | Previous projection | Measured result | Revised expectation |
|---|---|---|---|
| Part III, Section 4 (Token Budget) — Sprint-1-equivalent deletions | −5,167 tokens (four sections + Output Format, full deletion assumed) | **−1,632 tokens** (chars/4; only Voice/Posture + Output Format actually deleted) | Use the measured figure going forward. The remaining ~3,535-token gap corresponds to the three retained sections and is not recoverable without new consolidated authorship — it is not a deferred Sprint 1 task, it's a different, currently-unscoped task. |
| Part III, Section 4 — projected total after all Delete/Merge rows | ~28,000–30,000 tokens | Baseline (~35,194) → post-Sprint-1 (~33,562) | The eventual total will land higher than ~28,000–30,000 unless Sprints 2–7 recover more than currently scoped, or a future amendment authorizes new authorship for the three retained sections. Flagged as a real, not cosmetic, gap between design-time optimism and measured reality. |
| Part VIII, Sprint 1 "Success Criteria" | *"`interpret.js` line count reduced by the measured amount (~5,000 tokens' worth of deleted text)"* | Assembled prompt: −1,632 tokens (chars/4). Source file: **+22 lines** (net; new gate function and call-site wiring outweigh the ~75 lines of deleted inline text). | Both figures are now measured, not estimated, and are reported separately per Part VIII's own instruction not to conflate source-file size with assembled-prompt size. Neither matches the original success-criteria estimate; both are recorded as the actual result rather than reconciled backward to match it. |
| Part VIII, Migration Metrics table — "After Sprint 1" row | ~30,250 tokens, 0 orphaned modules | **~33,562 tokens**, 0 orphaned modules | Orphaned-module count matches exactly (this part of the projection was purely structural, not content-dependent, and held). Token figure revised down in magnitude of improvement, per the above. |

**Governing note for this section:** per the explicit constraint on this amendment, no section is being compressed here to recover the gap between projection and measurement. The gap is being recorded as a gap.

---

## 4. Prompt Module Audit

| Module | Status before Sprint 1 | Status after Sprint 1 | Sections proven irreplaceable by it | Sections successfully replaced by it |
|---|---|---|---|---|
| `theodicy.js` | Imported, active, conditionally gated | Unchanged | — | — (pre-existing, correctly scoped from the start) |
| `output-contract.js` | Orphaned | **Wired.** Interpolated once, unconditionally, in place of the old inline Output Format section. Confirmed to add one previously-missing field (`interpretive_context`) that the frontend already expects. | — | Output Format — Non-Negotiable (full) |
| `response-refresh.js` | Orphaned | **Wired**, but for a narrower scope than originally intended. Interpolated once, unconditionally, in place of only the Voice/Posture section. | Constitutional Response Principles; Demonstrate, Don't Explain; Relational Calibration & Active Listening — all three proven to contain content this module does not cover. | Voice, Posture & Register Calibration (full) |
| `relational-salvation.js` | Orphaned, and — newly discovered — **ungated** (no trigger logic existed anywhere in production) | **Wired**, with its gate function (`shouldLoadRelationalSalvation()`) newly written into production (exported, ported from the module's own pre-validated test logic) and interpolated conditionally at both call sites | — | — (this module replaced nothing; it was net-new production behavior, not a deduplication) |

**Modules that remain independent (i.e., were never claimed to overlap with anything and still don't):** none beyond what's listed — all four modules discussed in the dossier have now been addressed by Sprint 1.

---

## 5. Constitutional Findings

New architectural knowledge, not implementation mechanics:

- **A module's own header comment describing its intended scope is not evidence that the scope was achieved.** `response-refresh.js` was written with the stated intent of replacing "overlapping voice, posture, and response-principle instructions" — a reasonable design goal — but the actual authored content covers a narrower slice of that territory than the comment claims. This is worth generalizing: any future module extraction in this codebase should be verified against its actual content, not its stated purpose, before anything is deleted on its account. Sprint 4 (Escalation Ladder) and Sprint 5 (Recognition-Landing) both rest on a similar kind of claim (session Audit and Bad Faith Detection "duplicate" each other; Section Weighting and Emotional Completion share "an unstated principle") — both should be re-verified with the same rigor when their sprints execute, not assumed correct because Parts II and III already asserted it.
- **Some content survives four rounds of architectural analysis without being touched, and that's not a gap in the analysis — it's what correct analysis looks like.** The Wound Taxonomy content in Relational Calibration & Active Listening was read past, not read carefully, in the original Compression Audit (which viewed roughly the first half of the section and extrapolated). This is a caution about a specific failure mode — partial reading standing in for full reading when a section is long — rather than a general indictment of the prior phases' rigor.
- **A "conditional module" is not conditional until something in production actually branches on a condition.** `relational-salvation.js`'s own file header said *"Conditional module... Governs first move when both gates match"* — accurate as a design description, but not yet true as an implementation fact, since no gate existed. The distinction between "designed to be conditional" and "implemented as conditional" is now a concrete, evidenced category in this codebase's history, not just a theoretical one.
- **Test files can silently stop functioning entirely, not just drift from production logic.** The dossier's standing concern (Part I onward) was about tests hand-copying logic and thereby risking undetected drift. Sprint 1 found a more basic failure: a test that couldn't run at all. Both are "don't trust a green test" risks, but they're different risks requiring different checks — import resolution first, logic equivalence second.

---

## 6. Roadmap Updates

Reviewing Sprints 2–7 (Part VIII) against Sprint 1's findings:

- **Sprint 2 (Constitutional Authority consolidation):** unaffected. Nothing in Sprint 1 touched Scripture or Emet content. Proceed as specified.
- **Sprint 3 (Article II rewrite):** unaffected in sequencing or risk rating. Still the highest-risk sprint; still should not share a deploy window with anything else.
- **Sprint 4 (Escalation Ladder extraction):** **sequencing and scope unaffected, but add a mandatory pre-step.** Given Section 5's finding above, Sprint 4 must perform the same full side-by-side verification of Session Audit vs. Bad Faith Detection's ladder content that Sprint 1 performed here, before drafting the canonical Escalation Ladder Protocol — not proceed directly to drafting on the strength of Part V's dependency analysis alone. Part V's finding (near-verbatim duplication) is more textually certain than the response-refresh.js assumption was (it was based on quoting matching sentences, not a header comment), so this is a lower-probability correction than what just happened — but the verification step itself is now a standing requirement, not an optional courtesy.
- **Sprint 5 (Recognition-Landing):** same addition as Sprint 4 — verify Section Weighting & Illumination Protocol against Emotional Completion & Ontology Restraint's actual content in full before drafting, per the same reasoning.
- **Sprint 6 (Article cleanup):** unaffected.
- **Sprint 7 (final cleanup):** unaffected in structure. Its token re-measurement step will naturally reflect this amendment's revised baseline rather than the original projection.
- **New backlog item, unscoped in any existing sprint:** whether to write new, deliberately consolidated content that actually achieves what `response-refresh.js`'s header comment originally claimed (covering Constitutional Response Principles and the non-Wound-Taxonomy portions of Relational Calibration), or to formally accept those sections as permanently independent. This is a design decision, not an implementation task, and is explicitly out of scope for this amendment per the constraint against introducing new architecture.

---

## 7. New Standing Rule

**Implementation evidence supersedes architectural assumptions when validated through direct comparison of the production system. Such findings shall be incorporated into the Constitutional Architecture Dossier through formal amendment before subsequent implementation continues.**

This rule is now permanent and governs Sprints 2 through 7 identically: each sprint's own verification findings — not just Sprint 1's — get reconciled into the dossier before the next sprint begins, following this same amendment format (Original statement / Sprint N evidence / Corrected statement / Reason for amendment).

---

## 8. Version History

**Version 1.0** — Original compilation of Parts I–VIII (Migration Roadmap through Constitutional Implementation Plan). Design complete; implementation not yet started.

**Version 1.1** — Sprint 1 Architectural Reconciliation.

**Major Findings:**
- Three of four candidate voice/posture/response-principle sections were incorrectly classified as fully superseded; only one was. The largest (Relational Calibration & Active Listening, containing safety-adjacent Wound Taxonomy content) was misclassified as a duplicate and has been reclassified as distinct and retained.
- `relational-salvation.js` had no gate function anywhere in production — a deeper form of "orphaned" than the dossier's original finding described.
- `test-theodicy-gate.mjs` could not execute at all prior to Sprint 1, due to a broken import path unrelated to the drift risk the dossier had flagged.

**Impact:** Token projections revised downward for Sprint 1's actual scope (−1,632 measured vs. −5,167 projected); overall end-state projection likely lands higher than the original ~28,000–30,000 token estimate absent a future decision to author new consolidated content for the retained sections. Sprints 4 and 5 gain a mandatory verification pre-step as a direct consequence of this amendment's Section 6.

**Remaining Roadmap:** Sprints 2 through 7 as specified in Part VIII, with the Sprint 4/5 verification addition noted above. No sprint's sequencing, dependency order, or risk rating otherwise changed.

**Approved for Sprint 2.**
