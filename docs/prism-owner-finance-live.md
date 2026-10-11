# Prism owner finance — production

Owner console: `/owner-finance`. Uses the existing Supabase sign-in and a server-managed UUID allowlist. Financial tables are unavailable to anonymous and ordinary authenticated database clients. API responses are private/no-store and omit questions, answers, email addresses and credentials.

The headline shows estimated net profit beside completed initial and follow-up counts. Known costs are recorded from new Luna and retrieval embedding calls, including failures with reported usage. Unknown charges and historical capture gaps remain explicit. Provider rates are provisional until invoice reconciliation. Membership revenue allocation is not yet supported and is explicitly flagged when present. Do not treat unreconciled estimates as final business profit. Historical payments, refunds, transcription and provider invoices are not automatically backfilled.

The price workbench saves persistent proposals and per-credit math. It does not publish Stripe prices or change fulfillment. Expense entries, corrections, coverage confirmations and spending thresholds are saved live with owner authorization. The public demo is labelled sample data and cannot access or mutate production records.

Production launch preserves the existing Luna transport, prompt rules and runtime feature flags. The finance endpoint shares the existing transcription function through explicit rewrites to retain the Vercel function limit. The additive SQL is in `docs/migrations/prism-owner-finance-preview.sql`.
