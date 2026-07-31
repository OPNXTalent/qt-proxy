import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const interpret = fs.readFileSync(path.join(root, 'api', 'interpret.js'), 'utf8');
const frontend = fs.readFileSync(path.join(root, 'qt.html'), 'utf8');
const migration = fs.readFileSync(
  path.join(root, 'docs', 'migrations', '2026-07-31-persistent-inquiry-state.sql'),
  'utf8',
);

assert.match(interpret, /if \(isFollowUp\) \{/);
assert.match(interpret, /runPersistentInquiryFollowUp/);
assert.match(interpret, /type: 'stage'/);
assert.match(interpret, /buildAuditPrompt/);
assert.match(interpret, /splitApprovedResponse\(approved\)/);

for (const stage of [
  'restore',
  'reduce',
  'delta',
  'gate',
  'retrieval',
  'draft',
  'audit',
  'stream',
  'persist',
]) {
  assert.ok(
    interpret.includes(`emitStage('${stage}')`),
    `Missing canonical follow-up stage: ${stage}`,
  );
}
assert.match(interpret, /followup_total_complete/);

assert.match(frontend, /const followUpPrompt = input;/);
assert.match(frontend, /inquiryKey: isFollowUp \? getPersistentInquiryKey\(\)/);
assert.match(frontend, /parsed\.type === 'stage'/);
assert.match(frontend, /cachePersistentInquiryState/);

assert.match(migration, /create table if not exists public\.inquiry_states/);
assert.match(migration, /create table if not exists public\.inquiry_state_versions/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /p_expected_version/);

// The initial call remains unaware of follow-up state and still omits
// isFollowUp, preserving the canonical initial handoff.
const initialCall = frontend.slice(
  frontend.indexOf('async function callProxy(messages'),
  frontend.indexOf('function parseAIResponse'),
);
assert.doesNotMatch(initialCall, /inquiryKey:/);
assert.doesNotMatch(initialCall, /isFollowUp:/);

console.log('Follow-up execution and initial-parity contract checks passed.');
