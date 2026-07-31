# Persistent Inquiry Runtime — Release Verification Gate

Status: **not ready for preview until the pre-preview blockers in this document are corrected**.

This is an executable release gate for `agent/persistent-inquiry-runtime`. It is
not an architecture summary. Record evidence for every check. A section passes
only when every required criterion passes.

## 1. Automated gate

From the repository root:

```powershell
git status --short --branch
$failed = @()
Get-ChildItem tests -Filter '*.mjs' | Sort-Object Name | ForEach-Object {
  node $_.FullName
  if ($LASTEXITCODE -ne 0) { $failed += $_.Name }
}
if ($failed.Count) { throw "Failed: $($failed -join ', ')" }
node --check api/interpret.js
git diff --check
```

Pass:

- The branch is `agent/persistent-inquiry-runtime`.
- The worktree is clean before release.
- Every test exits zero.
- Syntax and whitespace checks exit zero.

Current local result: all 13 test files pass. External model, browser, PWA, and
network timing remain unverified.

## 2. Initial pipeline parity

Classification: **behaviorally equivalent**, with stronger static evidence for
the prompt itself. It is not byte-for-byte code parity.

Verified statically:

- The static `PRISM_SYSTEM_PROMPT` template before and after Phase II is
  identical after line-ending normalization: 137,274 characters.
- Its current interpolated base payload is 148,544 characters.
- `callProxy`, structured JSON parsing, early recognition extraction, and
  initial upstream delta streaming are unchanged.
- Only explicit `isFollowUp` branches enter `runPersistentInquiryFollowUp`.
- State-table availability is not consulted by the normal initial backend path.
- Existing initial-response tests pass.

Difference:

- `runInterpretation` now calls `resetPersistentInquiryKey()`. The call is a
  local state side effect and is currently unguarded; a storage exception could
  block an initial request. Correct this before preview.

Procedure:

1. Disable or make the Supabase inquiry tables unavailable in preview.
2. Submit `John 1:1`.
3. Confirm no `followup_*` timing event appears.
4. Confirm raw initial deltas and early recognition still appear.
5. Confirm the final response parses and renders using the existing structured
   contract.
6. Repeat with an ordinary non-verse question.

Pass:

- The server records the original initial timing sequence and no follow-up
  stage.
- The structured result and initial streaming behavior match production.
- Inquiry-state read/write failures do not alter the result.

## 3. Sequential continuity gate

Use a fresh test thread and capture the canonical `inquiry_states.state` after
each turn.

Initial:

> I am trying to decide whether to buy a hybrid or keep my current vehicle.

Follow-ups:

1. `Fuel cost is not actually my biggest concern.`
2. `Maintenance cost matters more.`
3. `I also tow a trailer several times a month.`
4. `Reliability matters more than maximizing savings.`

Expected transitions:

| Turn | Orientation/delta | Ground retained | Assumption/unresolved effect |
|---|---|---|---|
| 1 | Fuel cost is removed as presumed center | Vehicle decision | Primary criterion remains open |
| 2 | Maintenance becomes an active criterion | Fuel is not primary | Comparative maintenance evidence remains open |
| 3 | Towing becomes a hard use constraint | Maintenance remains relevant | Candidate towing suitability must not be assumed |
| 4 | Reliability becomes governing priority | Maintenance and towing remain relevant | Maximum savings is explicitly subordinated |

After every turn verify:

- Restore timing reports the preceding committed version.
- Reduction captures the newest proposition rather than its conversational
  intensity.
- `lastStructuralChange` describes only the delta.
- Ground is retained, amended, or removed according to the user's words.
- Unresolved claims are warranted and do not accumulate as a transcript.
- Assumptions remain assumptions.
- Trajectory describes structural movement, not a message summary.
- Confidence uses `directly_established`, `inferred`, or `tentative`
  proportionally.
- The patch contains only allowlisted fields.
- The response addresses the newest proposition while retaining the decision
  center.
- The committed state version advances exactly once and matches the response.
- There is no therapeutic framing, theology-specific language, or habitual
  closing question.

Automated evidence presently covers two sequential state transitions; the
four-turn live case is pending preview.

## 4. Domain-general continuity

Run four equivalent threads:

### Philosophy

- Initial: `If every decision has prior causes, in what sense am I responsible?`
- Follow-ups: `Influence versus determination may only be assumed.` →
  `I cannot locate an independent agent.` → `Non-location is not proof of
  absence.` → `Then responsibility may be relational rather than uncaused.`

### Theology

- Initial: `Why should God be trusted amid suffering?`
- Follow-ups: `Calling every painful event good would erase ra.` →
  `Tov means fit for the completed relational purpose.` → `Joseph distinguishes
  the harmful intention from the completed outcome.` → `That still does not
  give a linear observer the whole.`

### Relational judgment

- Initial: `My adult son repeatedly asks for money after choices I warned
  against.`
- Follow-ups: `I can afford to help.` → `My concern is consequence, not cost.` →
  `Saying no could still be punitive.` → `I need a boundary tied to purpose
  rather than guilt.`

### Adversarial argument

- Initial: `Mathematical coherence is only a baseline parameter of reality.`
- Follow-ups: `Calling it God needs further argument.` → `Calling it an
  impersonal brute fact also identifies it metaphysically.` → `A person may stop
  at I do not know.` → `The symmetry applies only when either side names the
  ground beyond that horizon.`

Pass:

- Each thread evolves its own center without importing another domain's
  language.
- Corrections remove prior assumptions.
- Adversarial rhetoric is reduced to claims without being neutered.
- Theology uses Scripture as arbitration without importing theology into
  mundane subjects.
- Questions occur only when ambiguity prevents a responsible comment.

## 5. Proposition reduction gate

Submit these directly to the reducer in preview and inspect the structured
result:

1. Concise claim: `The repair estimate is higher than the car's value.`
2. Emotional paragraph: describe a long frustrating repair history, ending
   with `My claim is that another repair is no longer proportionate.`
3. Ambiguous: `That is not really the issue.`
4. Correction: `No. My primary concern is reliability, not cost.`
5. Multiple claims: `The hybrid costs more, may tow less, and has a longer
   warranty, but reliability matters most.`

Pass:

- Primary/supporting propositions, examples, rhetoric, emotional language, and
  narrative are separate.
- Rhetorical intensity does not become evidence.
- Ambiguity remains tentative and can cause one necessary clarifying question.
- A correction receives directly-established confidence and overrides the
  inferred representation.
- Multiple claims remain distinct.

## 6. Constraint Gate

For every reduction inspect:

- observations and inferences;
- evidence boundaries;
- unsupported assumptions;
- unfalsifiable claims;
- what the draft must address.

Required before preview but not currently represented explicitly:

- logical closure;
- relevant Quadrant constraints;
- `questionNeeded`.

Pass:

- The gate is one compact structured call shared with reduction/delta.
- It does not run the initial interpreter.
- The missing fields above have been added and tested.

## 7. Precision-audit fixtures

Use these fixtures and compare the exact semantic delta:

| Fixture | Draft | Expected |
|---|---|---|
| Pass unchanged | `The estimate exceeds the vehicle's value, but that alone does not determine replacement cost.` | Identical meaning and wording |
| Targeted correction | `The estimate proves replacement is rational.` | Replace “proves” with proportional language |
| Therapeutic removal | `You are afraid because your father made money feel unsafe.` | Remove unsupported psychology |
| Excessive conclusion | `No independent agent was identified, so agency does not exist.` | Preserve the observation; reject the inference |
| Declarative ending | `Calling the unknown an impersonal baseline does not make the designation metaphysically neutral.` | No appended question |

Pass:

- The Prism's claims receive the same scrutiny as the user's.
- Sound text survives without wholesale rewriting.
- Corrections are localized.
- Certainty does not exceed evidence.
- No habitual question is appended.
- An audit failure produces a recoverable error and exposes no draft.

Current blocker: the implementation catches audit failure and streams the draft.

## 8. Streaming gate

Expected active-stage order:

1. restore;
2. reduce;
3. delta;
4. gate;
5. retrieval;
6. draft;
7. audit;
8. stream approved response;
9. persist.

Procedure:

1. Capture raw SSE in browser developer tools.
2. Confirm stage events arrive in the order above.
3. Force reducer failure, draft failure, and audit failure independently.
4. Interrupt generation before audit.
5. Compare with an initial interpretation capture.

Pass:

- A stage is emitted immediately before its actual work starts.
- No draft delta appears before `followup_audit_complete`.
- Failure returns a clear retryable state.
- No partial draft appears after interruption.
- Initial response streaming is unchanged.
- Exactly one terminal SSE event appears.

Automated integration confirms stage order and that successful unaudited text
does not appear. Audit-failure behavior currently fails this gate.

## 9. Persistence, recovery, and corrigibility

Run:

- normal refresh;
- browser/PWA close and reopen;
- network cancellation;
- stream cancellation;
- stale tab;
- two simultaneous follow-ups;
- delayed stale response;
- invalid browser cache;
- missing server state;
- unsupported state version;
- state write failure after response generation.

For correction, seed inferred state `primary concern is cost`, then submit:

> No. My primary concern is reliability.

Pass:

- Server state, never local cache, supplies the next turn.
- Invalid/unsupported state cannot overwrite a valid version.
- Optimistic conflict is detected.
- The immutable version remains available.
- An interrupted request does not commit its patch.
- A write failure does not send an uncommitted patch back as cacheable state.
- A delayed stale answer produces a visible recoverable conflict, not only a
  timing log.
- The correction removes/amends cost, marks reliability directly established,
  and records a correction in trajectory.
- The next response honors reliability.

Current automated integration passes sequential versions and simultaneous-tab
conflict preservation. Write-failure and visible stale-response handling require
pre-preview correction.

## 10. Browser and installed-PWA parity

Static evidence:

- Browser and PWA both execute `/qt.html`.
- The only standalone-mode branch hides the install control.
- No standalone branch changes follow-up execution or state handling.
- `/api/` is explicitly excluded from service-worker interception.
- HTML/code/navigation requests are network-first with offline fallback.
- Local inquiry cache is never sent as canonical state.

Execute the full vehicle thread in:

- desktop browser;
- installed desktop PWA;
- Android browser;
- installed Android PWA.

For each target record raw SSE, final response, state version, close/reopen
behavior, and service-worker version.

Pass:

- Runtime path, stage order, state contract, declarative ending, and approved
  prose are materially equivalent.
- Reopening restores the same server version.
- An old local cache cannot override it.
- Online launch receives the current `qt.html`.

Installed-PWA parity is pending live verification. The unrelated existing
Refraction-highlight discrepancy is outside this gate.

## 11. Prompt-weight audit

Measurements use the implementation's exact prompt builders and UTF-8 source.
The local runtime contains no compatible Anthropic or `tiktoken` tokenizer, so
token figures are the repository's existing closest approximation:
`round(characters / 4)`. Validate with the provider's token-count facility
before production if exact billing/context figures are required.

### Initial

| Payload | Characters | Approx. tokens |
|---|---:|---:|
| Static system template | 137,274 | 34,319 |
| Interpolated base system prompt | 148,544 | 37,136 |
| Typical short user message | 25 | 6 |
| Optional theodicy module | 11,924 | 2,981 |
| Optional salvation module | 2,361 | 590 |

Initial RAG is dynamic and adds up to four passages.

### Typical first follow-up

Measured against the first vehicle correction with no retrieved passage:

| Call | Characters | Approx. tokens |
|---|---:|---:|
| Haiku reduction + delta + gate | 1,959 | 490 |
| Sonnet draft | 3,070 | 768 |
| Haiku precision audit | 1,135 | 284 |
| Total model input | 6,164 | 1,542 |

### Typical later follow-up

Measured with established vehicle state and a 933-character retrieval fixture:

| Call | Characters | Approx. tokens |
|---|---:|---:|
| Haiku reduction + delta + gate | 2,398 | 600 |
| Sonnet draft | 4,309 | 1,077 |
| Haiku precision audit | 1,135 | 284 |
| Total model input | 7,842 | 1,961 |

There are exactly three model calls per successful follow-up:

1. Haiku reducer/delta/gate;
2. Sonnet draft;
3. Haiku audit.

The full 148,544-character constitution is included in **none** of them.
Follow-ups include a compact execution constitution, the Constraint Quadrant,
validated state, reduction/gate findings, the user's words, and focused RAG.
They omit the initial JSON output contract, profile/tier material, institutional
protocols, long topical instructions, artifact packs, and the full initial
constitution. Topical corpus material is selected by embedding a bounded query
made from the primary/supporting propositions, orientation, and up to three
unresolved claims; Supabase returns up to four passages.

Required conclusion: **Follow-ups no longer receive the full constitution.**
The implementation uses separate compact prompts for all three stages.

Worst-case findings:

- Validated state can reach 39,930 characters (~9,983 tokens).
- Reducer input can reach 45,259 characters (~11,315 tokens).
- Draft input without RAG can reach 107,865 characters (~26,966 tokens) using
  synthetic maximum fields.
- Audit input can reach 31,047 characters (~7,762 tokens).
- RAG passage text has no application-level character cap, so the true
  worst-case prompt is not finitely bounded by this implementation.
- `statePatch` is duplicated inside the draft's serialized analysis even though
  the validated updated state is already present.

Classification: state/analysis size and RAG caps are pre-preview corrections.
Normal prompt weight is a large improvement, but the unbounded path can recreate
latency/context pressure.

## 12. Execution boundary

Current determination:

```js
isFollowUp = body?.isFollowUp || false;
```

Findings:

- The browser sends Boolean `true` from `runFollowUp`.
- Any truthy client value, including string `"false"`, activates the runtime.
- A false positive sends an initial request into the new runtime.
- A false negative sends a follow-up through the initial interpreter. Existing
  quota logic separately treats `messages.length > 1` as follow-up, producing
  inconsistent classification.
- Restored and bidirectionally shared threads use the same composer and normally
  send `true`.
- Empty or corrupt state does not determine classification.
- The backend validates only inquiry-key syntax; it does not independently
  verify thread ownership/participation or that thread context exists.

Pass before preview:

- Accept only a strict Boolean or a server-verifiable follow-up context.
- Use one canonical classification for execution and quota behavior.
- Verify owned/shared/restored thread context server-side where available.
- Cover truthy strings, missing flags, missing keys, corrupt state, restored
  threads, and shared participation with boundary tests.

## 13. Migration readiness

The migration is structurally additive:

- Creates `inquiry_states`.
- Creates immutable `inquiry_state_versions`.
- Adds one index on `inquiry_states.thread_id`.
- Adds primary keys, non-negative version checks, and nullable UUID foreign keys
  to `threads` and `subscribers`.
- Enables RLS on both new tables.
- Creates one `SECURITY DEFINER` atomic commit RPC.
- Uses per-inquiry advisory locking and row locking.
- Adds no trigger, backfill, or alteration to an existing table.
- Existing threads remain unchanged and receive state lazily.

Defaults/nullability:

- Current version defaults to zero.
- `state`, keys, versions, and timestamps are non-null.
- Thread, owner, and request ID are nullable.
- Timestamps default to `now()`.

Blocking privilege defect:

- The script revokes RPC execution from `public` but does not explicitly grant
  it to `service_role`.
- It also relies on project default table grants for PostgREST service-role
  reads/writes.
- Add explicit least-privilege grants before migration.

Expected locking/execution:

- New empty tables and one index should execute quickly at current scale.
- No existing row rewrite or backfill occurs.
- Advisory/row locks affect only commits for the same inquiry key.

Compatibility:

- Migration before code is safe because the objects remain unused.
- Code before migration leaves initial responses intact but makes every
  follow-up state restore/commit fail and continuity degrade. Do not use this
  order.
- Destructive rollback would require dropping data. Prefer disabling the runtime
  and retaining tables/snapshots.

### Preflight SQL

```sql
select
  to_regclass('public.threads') as threads_table,
  to_regclass('public.subscribers') as subscribers_table,
  to_regprocedure(
    'public.commit_inquiry_state(text,integer,jsonb,uuid,uuid,text)'
  ) as existing_commit_function;

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'threads' and column_name = 'id')
    or (table_name = 'subscribers' and column_name = 'id')
  )
order by table_name;

select extname
from pg_extension
where extname = 'plpgsql';
```

Pass: both prerequisite tables exist, both IDs are UUID-compatible, and no
incompatible function already occupies the signature.

### Post-migration SQL

```sql
select
  to_regclass('public.inquiry_states') as current_table,
  to_regclass('public.inquiry_state_versions') as versions_table,
  to_regprocedure(
    'public.commit_inquiry_state(text,integer,jsonb,uuid,uuid,text)'
  ) as commit_function;

select relname, relrowsecurity
from pg_class
where oid in (
  'public.inquiry_states'::regclass,
  'public.inquiry_state_versions'::regclass
);

select
  has_table_privilege('service_role', 'public.inquiry_states', 'SELECT'),
  has_table_privilege('service_role', 'public.inquiry_states', 'INSERT'),
  has_table_privilege('service_role', 'public.inquiry_states', 'UPDATE'),
  has_table_privilege(
    'service_role', 'public.inquiry_state_versions', 'SELECT'
  ),
  has_function_privilege(
    'service_role',
    'public.commit_inquiry_state(text,integer,jsonb,uuid,uuid,text)',
    'EXECUTE'
  );

begin;
select * from public.commit_inquiry_state(
  'preflight:verification-only',
  0,
  '{"schemaVersion":1,"version":0,"turn":0,"orientation":"verification"}'::jsonb,
  null,
  null,
  'migration-verification'
);
select version, state
from public.inquiry_states
where inquiry_key = 'preflight:verification-only';
rollback;
```

Pass: objects exist, RLS is enabled, every privilege is true, the transactional
commit returns version 1, and rollback leaves no verification row.

### Non-destructive disablement

1. Disable the runtime with the proposed server-side environment kill switch.
2. Redeploy only the preview alias.
3. Retain both tables, all versions, and the RPC.
4. Revert application commits if longer-term disablement is required.
5. Do not drop tables until retention/export decisions are explicit.

Required settings/secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- proposed `PERSISTENT_INQUIRY_RUNTIME_ENABLED`

The service role must never be exposed to browser code.

## 14. Protected-preview runbook

Do not execute until blockers are corrected and separately approved.

1. Verify branch and worktree:

   ```powershell
   git branch --show-current
   git status --short
   git log -4 --oneline
   ```

2. Run the complete automated gate from Section 1.
3. Run migration preflight SQL.
4. Apply the corrected additive migration in Supabase.
5. Run post-migration SQL.
6. Configure Preview-only secrets and enable the runtime for this branch.
7. Push:

   ```powershell
   git push --set-upstream origin agent/persistent-inquiry-runtime
   ```

8. Create a draft PR against `main`; allow Vercel's branch push to create the
   Preview deployment. Do not use `vercel --prod`.
9. Confirm Vercel Authentication protects the Preview URL.
10. Run browser verification.
11. Run installed desktop/mobile PWA verification.
12. Run concurrency and interruption tests.
13. Export `[prism-timing]` and error logs.
14. Approve or reject merge. A merge is the production action and is outside
    this runbook.

The order should not change: application-before-schema causes persistence
degradation, while additive schema-before-application is inert.

Preview data:

- Preferred: a separate Supabase preview project with Preview-only Vercel
  variables.
- If Preview shares production Supabase, use a dedicated test subscriber,
  dedicated threads, and a unique inquiry-key prefix. This still shares corpus,
  access, query-log, and subscriber data and is materially riskier.
- Never reuse a real user's thread for preview.

Rollback:

- Remove the preview alias or revert the branch deployment.
- Set the proposed runtime flag false and redeploy Preview.
- Retain additive state tables.
- Do not promote or merge.

Current kill switch: none. Reverting code/deployment is the only equivalent and
is inadequate given limited rollback capacity. Add a server-side environment
flag before preview. It should affect only explicit follow-ups; initial
interpretations must never consult it.

## 15. Timing validation

Capture these timing events by request ID:

- `followup_restore_*`
- `followup_reduce_*`
- `followup_delta_*`
- `followup_gate_*`
- `followup_retrieval_*`
- `followup_draft_*`
- `followup_audit_*`
- `followup_stream_*`
- `followup_persist_*`
- `followup_total_complete`
- browser `submit`, `followup_stage_visible`, and
  `first_response_text_visible`

Run at least ten samples each:

- short follow-up;
- long follow-up;
- retrieval-heavy follow-up;
- retrieval-light follow-up;
- simultaneous-tab conflict;
- retry after interruption.

For each stage calculate median, p90, maximum, and failure count. For total
duration additionally report time to first progression and time to approved
prose. Associate the slowest total with its slowest stage by request ID.

Pass:

- No stage lacks start/complete evidence.
- Timing contains lengths/counts, not raw private inquiry text.
- Median/p90/slowest and slowest stage are reported from live Preview traffic.
- The 20-second objective is assessed from live runs.

Current result: pending. Mocked integration timings prove event coverage only
and cannot establish latency.

## 16. Commit review

### `c625c10` — Add versioned persistent inquiry state runtime

- Responsibility: state schema/validation, prompts, patching, migration.
- Files: runtime helper, SQL migration, unit test.
- Tests: `test-persistent-inquiry-runtime.mjs`.
- Later dependency: backend wiring in `673deb8`.
- Rollback: removes all unused runtime code; migration, if already applied,
  should remain rather than be destructively dropped.
- Concern: state maximum is too large; migration privileges are incomplete.

### `673deb8` — Route follow-ups through constraint-audited runtime

- Responsibility: hard branch locations, model stages, focused RAG, streaming,
  timing, persistence calls.
- File: `api/interpret.js`.
- Tests: source contract initially; integration arrives in `9d23fc4`.
- Later dependency: requires frontend context from `38ab6a4`.
- Rollback: returns backend to the existing interpreter; additive tables remain
  inert.
- Concern: audit-failure fallback exposes unaudited draft; classification trusts
  client input; no kill switch; unbounded RAG.

### `38ab6a4` — Connect follow-up UX to persistent inquiry runtime

- Responsibility: remove browser mega-prompt, send inquiry identity, consume
  stages and state versions, cache server result.
- Files: `qt.html`, execution-contract test.
- Later dependency: continuity hardening in `9d23fc4`.
- Rollback: old frontend is incompatible with the new continuity contract.
- Concern: unguarded initial-path storage reset; conflict is logged but not
  visibly recoverable.

### `9d23fc4` — Harden inquiry continuity and concurrent recovery

- Responsibility: stable inquiry keys, thread fallback, immutable-state
  recovery, interrupted-client handling, sequential/concurrent integration.
- Files: backend, frontend, integration test.
- Tests: `test-followup-pipeline-integration.mjs`.
- Later dependency: none.
- Rollback: loses concurrency/interruption safeguards and should not be reverted
  independently while retaining earlier commits.
- Concern: write-failure response still returns an uncommitted next state to the
  browser cache.

The commits are logically reviewable, contain no unrelated feature work, and
must not be squashed. Dependencies mean later commits should not be selectively
reverted without their predecessors.

## 17. Issues and disposition

| Severity | Evidence | Correction | Blocks Preview |
|---|---|---|---|
| Critical | Audit catch retains `approved = draft` | Fail recoverably; never emit draft | Yes |
| Critical | Migration revokes `public` RPC execution without granting `service_role` | Add explicit function/table grants | Yes |
| High | Truthy client `isFollowUp` controls execution; no thread-context validation | Strict/canonical server classification and tests | Yes |
| High | No runtime kill switch | Add follow-up-only server environment flag | Yes |
| High | State write failure returns/caches uncommitted next state | Return previous canonical state and visible retry status | Yes |
| High | State/RAG prompt worst case is unbounded or excessive | Cap total state, sanitized analysis, and retrieved text | Yes |
| Medium | Gate omits logical closure, relevant constraints, `questionNeeded` | Extend compact structured contract | Yes |
| Medium | Stale answer conflict is timing-only in UI | Display a recoverable conflict/retry notice | Yes |
| Medium | Initial inquiry-key reset can throw | Guard local storage cleanup | Yes |
| Low | Draft prompt serializes `statePatch` after applying it | Omit duplicate patch from draft context | No; pre-preview optimization |

