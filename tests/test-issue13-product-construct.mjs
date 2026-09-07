import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../docs/migrations/2026-09-06-pre-release-product-construct.sql', import.meta.url), 'utf8');
const interpret = fs.readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const share = fs.readFileSync(new URL('../api/share.js', import.meta.url), 'utf8');
const followups = fs.readFileSync(new URL('../api/followups.js', import.meta.url), 'utf8');
const welcome = fs.readFileSync(new URL('../api/welcome.js', import.meta.url), 'utf8');
const purchase = fs.readFileSync(new URL('../purchase.html', import.meta.url), 'utf8');
const webhook = fs.readFileSync(new URL('../api/webhook.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const { PRISM_PRODUCT, queryBankCreditsForAmount } = await import('../lib/product-config.js');

assert.deepEqual(PRISM_PRODUCT.explorer, { queries: 1, windowHours: 24 });
assert.deepEqual(PRISM_PRODUCT.subscription, { monthlyQueries: 35, monthlyPriceCents: 1999 });
assert.equal(queryBankCreditsForAmount(999), 10);
assert.equal(queryBankCreditsForAmount(1999), 25);
assert.equal(queryBankCreditsForAmount(1299), 0);

assert.match(migration, /completion_key text not null unique/);
assert.match(migration, /query_cost integer not null default 1 check \(query_cost = 1\)/);
assert.match(migration, /if new\.customer_query_cost = 0 then return new; end if;/);
assert.match(migration, /if v_source = 'subscription' then[\s\S]*elsif v_source = 'bank' then/);
assert.match(migration, /created_at > v_reset/);
assert.match(migration, /create or replace function public\.claim_prism_guest/);
assert.match(migration, /create or replace function public\.fork_shared_prism_inquiry/);
assert.match(migration, /unique \(share_id, owner_user_id\)/);
assert.match(migration, /created_at > v_reset/);
assert.match(migration, /update public\.prism_query_ledger set principal_type = 'user',[\s\S]*where guest_id = p_guest_id/);
assert.match(migration, /if v_guest\.claimed_by is not null then[\s\S]*v_guest\.claimed_by <> p_user_id[\s\S]*select true, true/);
assert.match(migration, /prism_fulfillment_events/);
assert.match(migration, /on conflict \(fulfillment_key\) do nothing;[\s\S]*if not found then return false/);
assert.match(migration, /customer_query_cost = 0 then return new/);
assert.match(migration, /after insert on public\.interpretation_artifacts/);

assert.match(interpret, /preparePrismInquiry\(/);
assert.match(interpret, /charge: false/);
assert.doesNotMatch(interpret, /return \{ isFollowUp: true, reason: 'participant' \}/);
assert.doesNotMatch(interpret, /return \{ isFollowUp: true, reason: 'shared_thread' \}/);

assert.match(share, /randomBytes\(24\)\.toString\('base64url'\)/);
assert.match(share, /owner_user_id:[ ]+senderUserId/);
assert.match(share, /permission === 'contributor'/);
assert.match(share, /fork_shared_prism_inquiry/);
assert.match(share, /resolveActiveShareCredential/);
assert.match(followups, /TRUST_CIRCLE_FORK_REQUIRED/);

assert.doesNotMatch(welcome, /purchased_credits\s*:/);
assert.doesNotMatch(welcome, /bonus queries/i);
assert.match(purchase, /1 Query \/ rolling 24 hrs/);
assert.match(purchase, /per month · 35 Queries/);
assert.match(purchase, /interceptConfiguredPurchase/);
assert.doesNotMatch(purchase, /buy\.stripe\.com/);
assert.match(webhook, /p_fulfillment_key: fulfillmentKey/);
assert.doesNotMatch(webhook, /purchased_credits/);
assert.doesNotMatch(webhook, /query_count/);
assert.doesNotMatch(webhook, /resetMonthlyQueries/);
assert.match(client, /entitlementSource/);
assert.match(client, /action: 'fork', shareId: window\._sharedViewShareId, token: window\._sharedViewToken/);
assert.match(client, /signInWithPassword\(\{ email: email, password: password \}\)/);
assert.match(client, /sessionStorage\.setItem\('prism_return_share', window\._sharedViewToken\)/);
assert.match(client, /x-share-token/);
assert.match(client, /entitlementSource === 'bank' \|\| entitlementSource === 'subscription'/);
assert.match(interpret, /\[prism-provider-cogs\]/);
assert.doesNotMatch(interpret, /measurement_id/);

console.log('Issue #13 product construct contract checks passed');
