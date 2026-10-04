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
