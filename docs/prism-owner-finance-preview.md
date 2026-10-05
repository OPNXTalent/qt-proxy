# Prism owner finance preview

This preview adds an owner-only financial report and a saved price-draft editor. It is on the experiment branch, not a production release. No checkout price, published credit allowance, production database or production deployment has been changed.

## Prices

The editor accepts USD membership and credit-bank prices, credits per allocation and the free allowance. It shows exact revenue per credit, two-credit initial inquiry revenue and one-credit follow-up revenue. Saved drafts are append-only, with submission IDs that make repeated submissions idempotent. Draft history retains the previous proposals. Saving does not publish a Stripe price or change credit fulfillment. The published configuration currently remains $49.99/350 monthly credits, $19.99/125 bank credits and five Explorer credits per 24 hours. The discussed $9.99/100 credits and three free credits can be saved as a proposal.

The public `?demo=1` view uses labelled sample data and simulated edits only. It performs no financial API reads or writes and does not bypass owner authorization. Actual draft persistence is in the private Supabase branch.

## Financial records

Each Luna or retrieval-embedding attempt within an interpretation request first receives a durable unknown-cost placeholder. If placeholder persistence fails, that provider dispatch is prevented. Reported tokens update the record after the attempt; missing usage, unsupported models and unsuccessful persistence remain unknown. Failures and free usage count toward spending. Reasoning tokens are already part of output tokens and are not billed twice. Usage-derived costs are provisional until invoice reconciliation.

Payment receipts captured from the existing signed Stripe webhook are idempotent by invoice or payment intent, and replay cannot erase a recorded fee or change the original credit-allocation event ID. Test receipts remain separate from business cash. Payment fees are not guessed. Hosting, database, processing and other statement expenses are manually append-only; signed correction entries preserve history. This first preview does not import Stripe refunds or billing-provider invoices. Complete statement reconciliation, including refunds and fees, is required before using the report for business profit.

Cash receipts and FIFO-estimated revenue attributed to consumed paid credits are separate. Gifts and free allocations have no invented revenue. Missing historical allocations and missing provider capture are warnings. The operating result remains unavailable when capture, invoices, fees or statement coverage are incomplete. Known cash result is a partial calculation, not audited profit. No customer questions, responses, emails or secrets are returned.

## Access and environment

The owner API verifies the bearer identity through Supabase Auth, then checks a server-managed owner UUID allowlist. User-editable metadata and first signup cannot grant access. Financial tables deny direct reads/writes to anonymous and ordinary authenticated clients; only the server role receives the necessary grants. Production access is disabled unless an explicit later release enables it. The API shares the existing transcribe function through a rewrite, retaining the twelve-function limit.

The additive schema was applied only to test branch `prism-luna-evaluation` (`pftfhbzrxfkdqmmburjp`). There are currently no test Auth accounts and no dashboard owners. Live authenticated owner access therefore remains pending. After the owner signs into the test branch, add only their verified Auth UUID server-side. Do not copy a production service-role key into browser code or designate the first signup automatically.

## Verification

- All 54 offline test scripts passed, including new authorization, price validation/idempotency, published-config preservation, cost math, FIFO allocation, failure-cost unknowns, webhook replay and concurrent request-isolation checks.
- Database grants inspected: RLS enabled on all six finance tables; anonymous and ordinary authenticated roles cannot read them; server reads allowed.
- A transactional draft round-trip stored $9.99/100 credits and three free credits; an invalid free allowance was rejected. All fixture account and draft changes rolled back, leaving zero accounts/drafts.
- Supabase advisor reports the intentional no-policy RLS design (server-only access). It also lists previously existing function search-path/execution and extension placement warnings; this work introduced no new SQL functions. Those existing findings are outside this dashboard change.
- No paid model calls were made for this implementation. Known API spending remains $1.475041095, with the retained old embedding reservation $0.261655700; conservative combined amount $1.736696795 is under the $2 cap.

The experiment is based on main commit `1d357ae304a037bbeb5608a72ade7e31c34f1174`. Remote main independently advanced to `8e143eee10392cca51dc8f7f233d085028c960d4`; these tests do not qualify that newer prompt module. Production promotion remains blocked pending a separate review.
