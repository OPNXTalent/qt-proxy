# Supabase Luna test branch

Created October 4, 2026 at 16:47:23 UTC (12:47:23 America/New_York), after explicit user approval of the quoted recurring cost.

| Item | Value |
| --- | --- |
| Name | prism-luna-evaluation |
| Branch ID | 45c1a25f-55c9-4c45-8b7b-0ae154353dd9 |
| Test project ref | pftfhbzrxfkdqmmburjp |
| Parent project ref | fgngixbhpilefmyyeldr |
| Production data included | No (`with_data:false`) |
| Persistent branch | No |
| Quoted compute rate | $0.01344/hour, $0.32256 per 24 hours, before other applicable usage |

Supabase reports the new project's health as `ACTIVE_HEALTHY`, but its branch workflow status is `MIGRATIONS_FAILED`. Read-only verification against the test project succeeded and confirmed zero tables in `public` and no completed migration history. This branch exists and is isolated, but it is not ready for application testing.

The parent's migration history begins with the September 2026 product-construct migration. The corresponding repository SQL references pre-existing `public.threads` and other application objects. Those foundation objects are absent on the fresh branch. This is a plausible baseline dependency problem; the exact failed statement has not been confirmed. A focused query of the new project's Postgres error logs returned no matching entries. Do not claim a completed schema clone.

Before connecting the preview, reconstruct and verify a schema-only application baseline on this test project, then apply and validate its migrations/RPCs/RLS. Copy no production user records, auth accounts, secrets, vault data or payment/email configuration. Apply changes only to the test project. Do not reset, rebase or merge production to repair this branch.

No Vercel database overrides have been applied. No live Luna requests, test users, database write tests or API spending occurred during branch creation. Production was not merged, redeployed or reconfigured. Existing preview isolation guards remain in the experiment branch.

Charges continue while the branch exists. Remove the isolated branch after testing or if it is abandoned; do not delete or pause the parent production project. This approved database cost is separate from the original $2 API evaluation cap.

The previous setup plan is in `prism-luna-preview-isolation.md`; its statement that no branch had yet been created describes the earlier preparation. This record supersedes that statement. The rollback checkpoint remains unchanged.

## Subsequent schema repair and verification

The creation observations above are historical. A schema-only baseline has now been installed on the isolated test project. Production was read only for catalog metadata; no production rows or sequence positions were copied. The reproducible baseline is `evals/model-qualification/luna-preview/schema-baseline.sql`, SHA-256 `ec374ac1b244f9f7def3952fa8a8f6d6c03009e9a00e8747e5fe7145c4483b77`. It refuses to run unless public application tables are absent. Migration `20261004165850` (`prism_luna_schema_only_baseline`) installed the baseline; a subsequent test-only `align_luna_preview_uuid_defaults` migration aligned 31 UUID defaults with `pg_catalog.gen_random_uuid()`.

Catalog comparison found no remaining differences in the captured application schema after normalizing ACL ordering and function line endings: 42 tables with RLS enabled, 29 application functions, 218 constraints, 137 indexes, 42 policies, seven custom triggers, two sequences, 992 table ACL entries and seven realtime publication entries. All 42 application tables, auth users/sessions and storage objects were empty. Sequences begin at one. The test branch has pgvector 0.8.2 versus production 0.8.0; retrieval compatibility still requires application testing.

A transaction-only synthetic guest smoke test passed and rolled back. A primary query consumed two credits from five, leaving three. Repeating the same completion did not debit again and left exactly one ledger entry. Anonymous execution of the protected credit function was denied, and anonymous access to protected guest records was blocked. No test records remained. The reproducible transaction is `evals/model-qualification/luna-preview/database-smoke.sql`. This verifies database behavior only, not browser authentication, model generation or the full preview.

Supabase's branch workflow still reports `MIGRATIONS_FAILED` from automatic initialization, although the database is healthy and the manually installed schema passed these checks. This is not a green branch workflow or production certification. No reset, rebase or merge was performed.

Security advisors reported inherited issues in the copied schema: mutable function search paths, vector installed in public, executable security-definer functions and RLS tables without policies. Definitions and grants were preserved rather than changed during provider migration. Remediation references: [function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [extension placement](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [anonymous function execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated function execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Vercel now has encrypted, experiment-branch-only preview overrides for `PRISM_PREVIEW_SUPABASE_REF`, `SUPABASE_URL` and `SUPABASE_ANON_KEY`. All three target only preview and git branch `agent/prism-model-qualification`; the create response reported three created entries and no failures. Existing production entries were not updated. The server-side key override remains missing: authenticated dashboard access was confirmed, but copy/reveal controls did not yield a transferable unmasked key through the browser API. No secret transfer file was written and no server key was submitted to Vercel. Manual secret configuration is required before deploying or testing this preview.

Google authentication initially led to GitHub account creation rather than the existing account; no account was created. Automatic review rejected an unapproved switch to password authentication, with no credential submitted by that rejected request. The user subsequently signed in manually to the existing GitHub account; Supabase's authenticated organization and isolated branch settings were then verified.

API evaluation spending remains $1.463676510, with no new generation requests or outstanding reservations. Database compute continues separately at the authorized rate. Production and its rollback checkpoint remain unchanged.

## Preview credential and build follow-up

The user's server-key entry is now saved: Vercel metadata confirms `SUPABASE_SERVICE_ROLE_KEY`, type sensitive, target preview, git branch `agent/prism-model-qualification`, ID `p9PXOYKpYLPmcLhK`. The older production/shared entry and its update timestamp are unchanged. Together with the three previously configured overrides, all four database settings are present. Metadata confirms scope, not validity or ownership of the opaque secret; actual service authentication still requires a new isolated deployment and connection check. The earlier missing-key statement describes the previous state.

The last preview build failed before these overrides existed. Build logs show offline route tests inherited Vercel's preview environment, then installed partial mock database configuration, triggering the isolation guard. The build runner now strips inherited credentials/database/test-allowance configuration from child test processes and sets their environment to test. A test-only preload rejects outbound fetches except loopback; tests may install their existing mocks. Runtime isolation checks remain unchanged. The runner aggregates every script failure rather than returning only the last script's status.

Two pre-existing tests were refreshed against the unchanged canonical source: the inquiry limit is 12,000, displayed as 12,000; direct-answer compliance is Move 10 and scientific corroboration is Move 11. The twelve-move module's coarse character-derived size check now retains a 5,000-token ceiling instead of the obsolete 3,000 ceiling. This test estimate is not a provider token count or pricing guarantee. No module text or production query limit changed. All 49 offline test scripts pass. No live provider call occurred. A rebuilt preview and authentication validation remain outstanding.


## Hobby function-limit repair

Preview dpl_CmhTym2nJwMJaiJKTT8bibBwoeq4 passed all 49 offline scripts and completed its build, but Vercel rejected deployment with exceeded_serverless_functions_per_deployment: the Hobby plan allows twelve functions. The added client-config function made thirteen. Its unchanged public allowlist handler now lives under lib/ and /api/client-config rewrites to the existing transcription function with a dedicated dispatch parameter. Configuration dispatch runs before transcription/provider access; normal transcription requests retain their behavior. There are twelve api JavaScript entry points. Tests check the rewrite, route count, configuration method restriction and separation from provider access. No plan upgrade or production deployment was made.
