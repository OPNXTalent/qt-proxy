import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const api = readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
const client = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const migration = readFileSync(
  new URL('../docs/migrations/2026-08-01-progressive-inquiry-delivery.sql', import.meta.url),
  'utf8',
);

for (const event of [
  "type: 'packet'",
  "type: 'canonical_complete'",
  "type: 'analysis_status'",
]) assert.ok(api.includes(event), `server emits ${event}`);

assert.ok(api.indexOf('await completeInterpretationArtifact') < api.indexOf("type: 'canonical_complete'"));
assert.ok(api.includes("operation === 'retry_artifact_analysis'"));
assert.ok(api.includes("charged: false"));
assert.ok(api.includes('completeFollowUpArtifact'));
assert.ok(api.includes('progressive_analysis_audit_start'));

for (const packetType of [
  'inquiry_orientation',
  'canonical_response',
  'interpretive_context',
  'prism_analysis',
]) assert.ok(client.includes(packetType), `client handles ${packetType}`);

assert.ok(client.includes('canonical_completion_available'));
assert.ok(client.includes('Prism Analysis incomplete.'));
assert.ok(client.includes('retryProgressiveAnalysis'));
assert.ok(client.includes('retryFollowUpAnalysis'));
assert.ok(client.includes('prism_active_inquiry_credential'));

assert.ok(migration.includes('primary key (artifact_id, artifact_revision)'));
assert.ok(migration.includes('unique (artifact_id, artifact_revision, sequence)'));
assert.ok(migration.includes('perform pg_advisory_xact_lock(hashtext(p_completion_key))'));
assert.ok(migration.includes('complete_followup_interpretation_artifact'));
assert.ok(migration.includes('revoke all on table public.interpretation_artifacts from anon, authenticated'));
assert.ok(api.includes("usageCreditSource === 'signal_credit'"));
assert.ok(api.includes("? 'purchased'"));
assert.ok(api.includes("usageCreditSource === 'tier_allocation'"));
assert.ok(api.includes("? 'monthly'"));
assert.ok(migration.includes("p_usage_credit_source = 'purchased'"));
assert.ok(migration.includes('select public.draw_signal_credit(p_owner_user_id)'));
assert.ok(migration.indexOf('select public.draw_signal_credit(p_owner_user_id)') < migration.indexOf('insert into public.query_log'));
assert.ok(migration.includes('on conflict (packet_id) do nothing'));
assert.ok(migration.includes('insert into public.threads'));

console.log('Runtime Constitution source conformance tests passed');
