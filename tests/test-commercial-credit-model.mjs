import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(new URL('../docs/migrations/2026-09-08-commercial-credit-model.sql', import.meta.url), 'utf8');

assert.match(sql, /perform pg_advisory_xact_lock\(hashtext\(p_completion_key\)\)/);
assert.match(sql, /if exists \(select 1 from public\.prism_query_ledger where completion_key = p_completion_key\)/);
assert.match(sql, /bank_balance = bank_balance - v_cost/);
assert.match(sql, /bank_balance >= v_cost/);
assert.match(sql, /query_cost\s*\n\s*\) values[\s\S]*v_submission_type|query_cost[\s\S]*v_cost/);
assert.match(sql, /p_query_cost not in \(1, 2\)/);
assert.match(sql, /coalesce\(v_access\.remaining, 0\) < p_query_cost/);
assert.match(sql, /new\.customer_query_cost := case when new\.artifact_revision = 1 then 2 else 1 end/);
assert.match(sql, /if new\.customer_query_cost <> 0/);
assert.match(sql, /allocation_key = 'registration:' \|\| p_user_id::text \|\| ':welcome'/);
assert.match(sql, /on conflict \(fulfillment_key\) do nothing/);
assert.match(sql, /bank_balance = public\.prism_entitlements\.bank_balance \+ excluded\.bank_balance/);
assert.doesNotMatch(sql, /bank_balance\s*=\s*0/);

console.log('Commercial credit model invariants passed');
