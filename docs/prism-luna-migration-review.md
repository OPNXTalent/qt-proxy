# Prism Luna migration — experiment branch

Prepared October 4, 2026 for draft PR #22. This is a reviewable runtime migration, not production qualification. No merge, deployment promotion, production environment change or database migration is included.

## Resulting behavior

All active generation calls in `api/interpret.js` use `gpt-6-luna` through the OpenAI Responses endpoint: initial canonical answers, disabled-runtime follow-up answers, follow-up reduction/drafting/auditing, transcript extraction and the noncritical closure check. There is no Anthropic runtime fallback. Historical evaluation adapters retain Sonnet support so comparisons remain reproducible. Historical source-repair scripts are not migration commands and must not be run over this change.

The handler's `callInquiryModel` entry point delegates to `lib/luna-provider.js`. The provider requires the server-side `OPENAI_API_KEY`, uses low reasoning, the default service tier and `store:false`, and sends no sampling parameters. Model selection is fixed to Luna, including extraction; the former `PRISM_EXTRACTION_MODEL` override no longer selects another provider. The provider logs the returned model ID for later verification. No API key values are written to Git or logs.

Existing system/user text, module activation, retrieval and approved-learning integration remain intact. All 50 qualification snapshots were compared with pre-migration commit `779c0555028dc1f11c98d6948608a5440c1709ec`, both without context and with identical frozen retrieval/learning context: every snapshot matches. Neither controlled-v1 nor controlled-v2 overlay is adopted. Anthropic cache annotations remain in the internal canonical block builder for snapshot compatibility; the transport concatenates their text exactly and omits provider-specific metadata on the wire. OpenAI prefix caching replaces the explicit ephemeral-cache request; actual cache savings require measurement.

Browser `response_delta` events still contain visible prose only. Reasoning deltas are excluded. The completed response must agree with the streamed text before the existing completion/persistence path can proceed. Truncated, refused, missing-usage, malformed and unterminated responses fail rather than being treated as completed answers. Idle and total stream deadlines cover stalled body reads as well as request headers. The transport performs no retries; existing application-level optional audit/closure fallback behavior remains intact.

Forced function output preserves the existing structured schema with `strict:false`, one selected function and parallel calls disabled. Existing application validators remain responsible for semantic validation. This preserves optional fields without silently rewriting their schema to strict mode.

Usage logs retain the existing `[prism-provider-cogs]` fields and add provider, resolved model, response ID, service tier, reasoning tokens and `usageKnown`. Output tokens already include reasoning; do not charge reasoning twice. When final usage is unavailable, token fields are null, not zero. These logs record usage, not invoice reconciliation or a hard production spend ceiling.

## Output ceilings

Existing numeric ceilings are retained. Responses counts reasoning and visible text together, so the same number can yield less visible prose than the previous provider. No hidden allowance is added. Live validation must check truncation and content coverage.

| Stage | Total output-token ceiling |
| --- | ---: |
| Initial answer | 3,600 |
| Disabled-runtime follow-up fallback | 900 |
| Follow-up reducer | 1,800 |
| Follow-up draft | 2,400 |
| Follow-up audit | 1,400 |
| Transcript extraction | 8,000 |
| Closure check | 2,000 |

## Validation

- Seven new offline transport tests pass: request mapping; usage and redaction; fragmented UTF-8 SSE; forced function output and progress; rejection of partial/refused/missing-usage results; safe HTTP rejection without retries; stalled-header/body and total-stream timeouts.
- The existing canonical streaming test now exercises Responses events through the handler entry point and still checks browser/persistence contracts. The commercial contract test follows telemetry into the new provider module.
- Full suite: 48 test scripts, 46 passed, two failed. Both failures reproduce on the untouched pre-migration checkout: `test-query-intake-limit.mjs` expects a 4,000-character input attribute while the existing UI uses 12,000; `test-theodicy-gate.mjs` expects an older Move 10 heading and smaller module budget. They are unresolved existing checks, not migration passes. No production build qualification is claimed.
- JavaScript syntax checks and `git diff --check` pass.
- No live generation, provider spend or database writes occurred during this implementation. Cumulative evaluation spending remains the reported $1.463676510; no new reservations were made.

Transport correctness does not resolve Luna's content and delivery deficits. The current five-case evaluations remain provisional, below the quality gate and insufficient for production certification. Supporting reducer/audit/extraction/closure stages have not had live Luna evaluations.

## Preview validation before promotion

Use an isolated preview with test data and credentials scoped to that environment; a preview sharing the production Supabase service key can still write production records. Confirm the preview key can access Luna and distinguish it from the desktop 30-day evaluation key. Do not copy or expose keys in the review artifacts.

Validate the actual initial answer and follow-up flows, Scripture-first rendering, streaming completion, artifact/thread reload, authenticated and guest ownership, unchanged credit charging and failure handling. Check reducer JSON, optional audits, transcript extraction and closure separately. Retest the suffering and Shroud coverage deficits, open-ended questions and preservation cases under production-like retrieval/learning context. Reconcile usage/cost and ensure the chosen live test budget is explicitly bounded before dispatch. No such paid validation was run here.

Production promotion remains a separate decision. The recovery source and deployment are recorded in [the rollback runbook](prism-pre-luna-rollback-2026-10-04.md): branch `rollback/prism-pre-luna-2026-10-04`, source `1d357ae304a037bbeb5608a72ade7e31c34f1174`, deployment `dpl_DKR8bJQZ6EubkHgvS27uhaaWA7AC`. Retain the working Anthropic credential/account during the recovery window; this is temporary rollback support. No database restore, account cancellation or credential revocation accompanies this branch change.
