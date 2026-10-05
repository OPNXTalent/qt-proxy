# Luna preview: usage telemetry and closing-question experiment

Status: preview validation completed for telemetry and guest archive recovery; closing-question reliability remains unresolved. This is not production qualification. User authorized continued preview work and testing. No merge or production promotion.

The retrieval embedding helper now logs reported prompt/total token usage, application and provider request identifiers, stage, server-selected turn type, latency, completion status and retry ordinal. It validates single-input usage and the returned vector; missing usage remains unknown, never zero. Invalid responses are not used for retrieval. A 15-second deadline bounds headers and body reads, with no automatic retry. Existing retrieval error fallback remains unchanged. No input text, vectors, credentials or raw provider errors are logged. Provider usage fields follow the official embeddings documentation: https://developers.openai.com/api/docs/guides/embeddings.

A separate append-only treatment applies only to initial canonical generation when VERCEL_ENV equals preview. It clarifies that a What/How sentence can still be forced choice, directs the model to remove offered alternatives, and preserves all existing exceptions, Scripture-first ordering and substantive requirements. It is an experiment, not evidence of improved behavior. Follow-up prompts, production prompts, governing modules and frozen qualification captures are unchanged. No completed answer is rewritten. The exact treatment is in lib/luna-closing-experiment.js.

Six new offline tests cover usage attribution/privacy, unknown usage, billed malformed output, timeout/no-retry behavior, preview-only activation and qualification preservation. The existing cache-boundary assertion now recognizes the preview wrapper while still requiring the canonical cached system. Full offline suite: 51 scripts passed, zero failures.

Known API spending before this validation remains $1.468020810. The original unresolved embedding reservation remains $0.261655700; its exact usage cannot be recovered from the old application response. It is not called zero or retrospectively estimated as an actual charge. One additional initial inquiry may reserve $0.266 while preserving that reservation: known spend plus both reserves is $1.995676510 under the original $2 cap. No further request may dispatch without a separate ledger check. Database compute is separate. Live validation must stop on incomplete output, unknown new usage or a failed quality boundary.

Required live check: exactly one initial echad inquiry, no retry; verify new embedding telemetry, Luna completion usage, saved/reloaded answer, one two-credit debit, and specific open-ended ending. One case cannot certify reliability or suffering/Shroud coverage. Subscriber, follow-up, closure and nonempty retrieval remain separate pending checks.

Production remains on the restored Sonnet deployment. PR #22 remains draft and unmerged. Working Anthropic access and the pre-Luna rollback checkpoint remain available.

## Live results at commit 375e483

The isolated preview deployed READY. Exactly one initial echad inquiry completed with one embedding and no retry. Embedding usage was recorded: 14 input/total tokens. Luna reported 33,496 input, 33,493 cache-write, zero cached-input and 317 output tokens including 157 reasoning tokens. Combined cost was USD 0.004345705. A relevant open-ended final question passed the manual delivery check; lexical restraint and Scripture-first final layout were preserved. The answer reopened after reload, the balance remained three, and one completion ledger row debited two credits. This single case cannot establish reliability or a causal treatment effect.

One separately reserved follow-up was then attempted after archive reload. It failed: classification returned unverified_client_hint and incorrectly entered primary generation; the provider completed but artifact persistence failed. Reducer, draft and audit were never reached. The database retained one completion row and two credits debited, so this failed request did not debit another credit. Its Luna cost was USD 0.000503425, embedding cost USD 0.000000220 (11 tokens), total USD 0.000503645. No automatic retry occurred. Known cumulative spending is USD 1.472870160; the earlier unknown-charge reservation remains USD 0.261655700, combined USD 1.734525860. New usage is fully recorded; the old missing usage is not retroactively inferred from a different request.

Diagnosis: selecting an archived thread clears the in-memory inquiry credential. Subscriber thread ownership can recover classification, but the classifier previously omitted verified guest thread ownership. The candidate fix passes the server-verified guest identity to the same scoped ownership lookup and rejects an unverified continuation before paid generation instead of silently treating it as a new inquiry. Tests deny other guests, a bare client hint and failed ownership lookups. It does not trust a guest ID supplied by the browser or grant arbitrary thread access. No database schema changes are included. The full offline suite now contains 52 passing scripts. Live guest continuity and subsequent credit/persistence behavior still require validation on the rebuilt preview.

## Guest archive recovery live verification

Commit 86d69063e590fbd3e9be48b5a6ec438bf1f6494d ran in READY preview dpl_8bCpVJ83UqiZFHU9bfAxELGwpmQp. Exactly two additional application requests, no retries: a new initial echad inquiry, then one follow-up after browser reload and archive reopening. Initial completion succeeded, but its required closing question was absent: the closing treatment is unreliable and remains evaluation-only.

The follow-up classified as owned_guest_thread, restored state version 0, and completed reduction, draft and audit. Persistence committed artifact revision 2 and state version 1 in 14.905 seconds. Test DB ledger shows one primary completion costing 2 credits and one follow-up completion costing 1 credit, with no duplicate debit. Retrieval succeeded with zero passages; populated retrieval, subscriber access, acknowledgement and closure are still untested live. Follow-up rendering exposes literal Markdown asterisks; this is a separate presentation issue.

Initial cost USD 0.000477510; follow-up cost USD 0.001693425, including its 65-token embedding. Reported usage reconciled and new reservations released. Known cumulative API spending USD 1.475041095; older unresolved reservation USD 0.261655700 retained; conservative combined accounting USD 1.736696795, under the original USD 2 cap. Costs remain usage-derived, not invoice reconciled. No scientific qualification or model-wide reliability claim follows from these two requests.

Production remains unchanged; PR #22 remains draft and unmerged.

The saved follow-up survived a second browser reload and archive reopening.
