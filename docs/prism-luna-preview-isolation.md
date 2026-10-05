# Luna preview isolation and test setup

October 4, 2026. Live testing has not started. No provider calls, database writes, paid database branch creation or production configuration changes occurred.

## Observed blocker

The Luna migration at commit `7cec50c09c32c075cfb37caf2ea87c87d2986140` reached READY in Vercel preview deployment `dpl_fcLpGiyarsgzh3ekofVeyj1YAzRv`. READY is build status, not end-to-end qualification. The project environment metadata assigns the same `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` entries to preview and production, with no override for this experiment branch. Browser auth/realtime also used hardcoded production Supabase configuration. Therefore the existing preview is not an isolated test environment and must not be used for generation or persistence tests.

The Prism's production Supabase project is `fgngixbhpilefmyyeldr`, organization `othufjicdbqgkscjrqzz`. The connected Supabase account reports no existing development branches on that project. Other projects belong to separate products and are not suitable test destinations.

Supabase's connected cost tool returned a branch compute rate of **$0.01344/hour** on this organization, equivalent to **$0.32256 for 24 hours**, before any other applicable usage. This is separate from OpenAI evaluation spending. The branch-creation tool requires explicit confirmation of recurring cost. No cost confirmation or branch creation has been performed.

## Prepared changes

- Database-consuming server routes and the learning module import a preview isolation guard. In `VERCEL_ENV=preview`, it requires an explicit nonproduction project ref and a matching Supabase URL plus credentials. It runs before provider calls or database requests. An unconfigured preview is intentionally unavailable.
- `/api/client-config` returns only the deployed Supabase URL and public anon/publishable key as uncached JavaScript. It never exports the service-role key or provider credentials. Missing or invalid configuration returns 503.
- Browser auth, password reset, direct database calls and realtime use that configuration instead of embedded production addresses and keys. The script loads before inline application code. Existing service-worker rules bypass `/api/`, so client configuration is not cached by the app worker.
- Legacy JWT keys are checked for matching project ref and expected role. Modern opaque key prefixes can be validated for key type, but their project ownership cannot be proven offline; take them from the branch's own settings and verify authentication against that branch before any write test. These checks do not validate JWT signatures or replace Supabase authentication/RLS.
- Production mode does not activate the preview guard. On any future promotion, browser configuration would use that deployment's production environment. No promotion is included here.

## Required setup after cost confirmation

1. Create a data-less Supabase development branch named `prism-luna-evaluation` on the existing Prism project. Do not include production data, merge, reset or rebase production. Verify its schema/RPC migrations against the current application; a branch with incomplete migration history is not ready for app tests.
2. Obtain URL, public key and server-side service key from that branch only. Keep privileged credentials out of Git, reports and browser configuration.
3. Add Vercel overrides targeted to **preview** and git branch **agent/prism-model-qualification** only:

   | Variable | Value source |
   | --- | --- |
   | PRISM_PREVIEW_SUPABASE_REF | New branch project ref |
   | SUPABASE_URL | New branch URL |
   | SUPABASE_ANON_KEY | New branch anon/publishable key |
   | SUPABASE_SERVICE_ROLE_KEY | New branch server-only service key |
   | PREVIEW_TEST_USER_IDS | Synthetic test account IDs in the branch |
   | PREVIEW_TEST_QUERY_ALLOWANCE | Bounded test allowance |

   Preview overrides must not change shared production entries. Verify an appropriate Luna-capable OpenAI key for the test; the desktop 30-day evaluation key is a separate credential.
4. Rebuild preview after applying the overrides. Verify the source commit, deployment environment, public configuration and branch schema before testing. Existing deployed versions retain their old environment, so use only the newly isolated deployment.
5. Seed only synthetic test identities, credits and records. Do not copy production user data or trigger real purchases, email invitations or scheduled notifications. Validate auth using branch credentials before write tests.

The branch will continue accruing charges until removed. Keep it only as long as needed for this test; delete the test branch after verification or report any reason it must remain. Deleting the development branch must not affect the production project.

## Live test sequence

| Flow | Evidence required |
| --- | --- |
| Initial answers | Relevant opening Scripture, visible-only streaming, completed usage, final answer persisted once |
| Preservation cases | Lexical restraint and refusal to fabricate Scripture remain intact |
| Difficult content | Suffering and Shroud coverage/source discipline reviewed against existing checklist; no stronger unsupported claims |
| Follow-ups | Reducer JSON valid; draft/audit/closure behavior appropriate; state version and thread reload correct |
| Ownership | Authenticated and guest identities restricted to their own test records; cross-account access rejected |
| Credits | Correct test debit on success; no double debit on reload/retry; incomplete generation handled correctly |
| Transcript extraction | Luna output parses and passes existing record validators |
| Failures | Timeout, incomplete output and provider rejection do not commit a completed artifact or silently change provider |

No paid test expands the original $2 API cap. Last reported cumulative spend is $1.463676510, leaving $0.536323490 with no reported reservations. Reconcile any concurrent desktop activity and current rates, count all planned stage inputs and reserve their full output caps before dispatch. Failed/uncertain requests keep their reservations; no automatic retries. Missing supporting-stage coverage must remain explicitly unqualified rather than being inferred from five primary answers.

## Offline validation completed

Five isolation tests pass: shared/mixed configuration rejection; public allowlist; preview route import rejection before network calls; endpoint status/cache behavior; browser script parsing and deployed-config wiring. Existing subscriber authorization checks pass with matching synthetic preview configuration. The other previously passing tests remain passing; two pre-existing query-limit and theodicy checks remain unresolved. All 50 canonical prompt snapshots remain identical to the pre-migration baseline. Syntax and diff checks pass. Live browser behavior, Supabase persistence and real provider quality remain untested.

The production rollback checkpoint remains documented in `prism-pre-luna-rollback-2026-10-04.md`. This work is confined to the experiment branch and draft PR #22.
