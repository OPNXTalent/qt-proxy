# Luna preview: usage telemetry and closing-question experiment

Status: prepared for isolated preview validation, not production qualification. User authorized continued preview work and testing. No merge or production promotion.

The retrieval embedding helper now logs reported prompt/total token usage, application and provider request identifiers, stage, server-selected turn type, latency, completion status and retry ordinal. It validates single-input usage and the returned vector; missing usage remains unknown, never zero. Invalid responses are not used for retrieval. A 15-second deadline bounds headers and body reads, with no automatic retry. Existing retrieval error fallback remains unchanged. No input text, vectors, credentials or raw provider errors are logged. Provider usage fields follow the official embeddings documentation: https://developers.openai.com/api/docs/guides/embeddings.

A separate append-only treatment applies only to initial canonical generation when VERCEL_ENV equals preview. It clarifies that a What/How sentence can still be forced choice, directs the model to remove offered alternatives, and preserves all existing exceptions, Scripture-first ordering and substantive requirements. It is an experiment, not evidence of improved behavior. Follow-up prompts, production prompts, governing modules and frozen qualification captures are unchanged. No completed answer is rewritten. The exact treatment is in lib/luna-closing-experiment.js.

Six new offline tests cover usage attribution/privacy, unknown usage, billed malformed output, timeout/no-retry behavior, preview-only activation and qualification preservation. The existing cache-boundary assertion now recognizes the preview wrapper while still requiring the canonical cached system. Full offline suite: 51 scripts passed, zero failures.

Known API spending before this validation remains $1.468020810. The original unresolved embedding reservation remains $0.261655700; its exact usage cannot be recovered from the old application response. It is not called zero or retrospectively estimated as an actual charge. One additional initial inquiry may reserve $0.266 while preserving that reservation: known spend plus both reserves is $1.995676510 under the original $2 cap. No further request may dispatch without a separate ledger check. Database compute is separate. Live validation must stop on incomplete output, unknown new usage or a failed quality boundary.

Required live check: exactly one initial echad inquiry, no retry; verify new embedding telemetry, Luna completion usage, saved/reloaded answer, one two-credit debit, and specific open-ended ending. One case cannot certify reliability or suffering/Shroud coverage. Subscriber, follow-up, closure and nonempty retrieval remain separate pending checks.

Production remains on the restored Sonnet deployment. PR #22 remains draft and unmerged. Working Anthropic access and the pre-Luna rollback checkpoint remain available.
