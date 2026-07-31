# Subscriber authentication contract

Subscriber authorization for `/api/interpret` uses:

```http
Authorization: Bearer <supabase_access_token>
```

The API validates the bearer token with the configured Supabase project's
`/auth/v1/user` endpoint. The verified Auth UUID is the canonical identity.
Because the current `subscribers` table is historically keyed by email, the
verified identity's email is used only as a temporary server-side bridge to the
existing subscriber record. Request-body and query-string identity fields do
not participate in authorization.

Requests without a bearer token use the ordinary Observer/free path. Requests
that provide an invalid, expired, revoked, malformed, or project-mismatched
token are rejected; they never fall back to body email or another subscriber.
An unavailable identity provider produces a recoverable service error.

## Preview release entitlement

Preview release testing is disabled by default and requires all three:

- `VERCEL_ENV=preview`
- `PREVIEW_TEST_USER_IDS` containing valid, unique Supabase Auth UUIDs
- `PREVIEW_TEST_QUERY_ALLOWANCE` containing an integer from 1 through 200

The Preview entitlement changes only the bounded query allowance. It does not
change tier, billing, Stripe linkage, or permanent subscriber data. Malformed
configuration fails closed. Production ignores the configuration even if the
variables are accidentally present.

To revoke test access, remove the UUID from `PREVIEW_TEST_USER_IDS` (or remove
both Preview variables) and redeploy Preview. No production configuration is
required.

## Browser and installed PWA

Both use `qt.html`. The shared request helper obtains the active session from
the existing Supabase client and sends its current access token in the
Authorization header. Tokens are never put in URLs, request bodies, analytics,
timing metadata, or visible errors.

## Repository trust audit

| Input | Classification | Disposition |
|---|---|---|
| `/api/interpret` body/query email, user ID, tier, subscriber, allowance, role | Authorization-sensitive | Ignored; bearer identity is canonical |
| `/api/interpret` inquiry credential and key | Authorization-sensitive | Existing server HMAC credential validation retained |
| Stripe webhook customer, subscription, tier, and balance fields | Authorization-sensitive | Stripe-signed event and server-side price mapping retained |
| `/api/redeem` registration email/tier | Onboarding | Paid tiers already rejected; no subscriber interpretation entitlement is granted |
| Share sender/recipient email metadata | Authorization-sensitive for ownership; display-only otherwise | Sender ownership is derived from verified bearer identity |
| Browser local email/tier | Display and UI hint only | No longer grants backend interpretation entitlement |
| Browser timing/request ID | Telemetry-only | No authorization effect |
| Legacy `highlights.js` local email | Legacy/dead interpreter copy | Not loaded by the canonical browser/PWA entry |

Thread, follow-up, migration, share ownership, anonymous-session claiming, and
welcome-credit APIs use the same verified bearer identity contract. Legacy
email headers and body fields may remain in old clients as inert compatibility
metadata, but they do not select an account, grant allowance, claim a resource,
or assign credits.
