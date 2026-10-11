# Published pricing

The owner console has separate Save price draft and Publish paid prices actions. Publishing confirms membership and ad-hoc package prices and credit quantities, creates immutable Stripe USD prices and payment links with version metadata, then atomically switches the active server-side pricing version. Stale concurrent publications are rejected. Stripe operations use per-version idempotency keys. Failures before the database switch leave the prior published version active; unused Stripe objects may remain for a failed publication.

Public prices and checkout links load from the active version. Purchase clicks refresh current pricing before navigation. Webhook fulfillment resolves the purchase version against private database records, preserving older subscription/package terms. Both the credit ledger and fulfillment database now accept 1–10000 credits. Paid prices are limited to $0.50–$1,000.00. The free allowance stays at five per 24 hours.

The pricing tables and publish RPC are accessible only to service_role. Owner mutations require a server-verified Supabase identity and the existing owner allowlist. No secret is returned to the browser. Stripe publication is not invoked automatically during deployment. Owners select and publish their desired prices.

Verification covers Stripe parameters, metadata, immutable package versions, concurrency rejection, legacy package fulfillment, owner authorization and configurable database credit grants in a rolled-back transaction. Existing checkout is preserved until the first owner publication. Existing subscribers are not migrated to new rates.
