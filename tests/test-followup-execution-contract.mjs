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

assert.match(interpret, /if \(followUpContext\.isFollowUp\) \{/);
assert.match(interpret, /runPersistentInquiryFollowUp/);
assert.match(interpret, /type: 'stage'/);
assert.match(interpret, /buildAuditPrompt/);
assert.match(interpret, /constructAuditedArtifact/);
assert.match(interpret, /createCanonicalPackets\(artifact\)/);
assert.match(
  interpret,
  /model: 'claude-sonnet-4-6',[\s\S]*?timeoutMs: 25000,[\s\S]*?prompt: draftPrompt/,
);

for (const stage of [
  'restore',
  'reduce',
  'delta',
  'gate',
  'retrieval',
  'draft',
  'audit',
  'persist',
]) {
  assert.ok(
    interpret.includes(`emitStage('${stage}')`),
    `Missing canonical follow-up stage: ${stage}`,
  );
}
assert.match(interpret, /followup_total_complete/);
assert.match(interpret, /FOLLOWUP_ARTIFACT_LINEAGE_INVALID/);
assert.match(interpret, /artifact_id=eq\.\$\{encodeURIComponent\(artifactId\)\}/);
assert.match(
  interpret,
  /if \(!rows\?\.length && !lineageArtifact && \/\^\[0-9a-f-\]\{36\}\$\/i\.test\(threadId \|\| ''\)\)/,
  'A validated artifact lineage must bypass thread-level inquiry-state fallback',
);
assert.match(
  interpret,
  /if \(!rows\?\.length\) \{[\s\S]*?inquiryKey,[\s\S]*?artifactId: lineageArtifact\?\.artifact_id \|\| null,[\s\S]*?artifactRevision: lineageArtifact\?\.artifact_revision \|\| 0/,
  'Missing inquiry state must preserve the validated artifact lineage',
);
assert.match(interpret, /revision: Math\.max\(previousState\.version \+ 1, restored\.artifactRevision \+ 1\)/);

assert.match(frontend, /const followUpPrompt = input;/);
assert.match(frontend, /inquiryKey: isFollowUp \? getPersistentInquiryKey\(\)/);
assert.match(frontend, /artifactId: isFollowUp && window\._lastParsedResult/);
assert.match(frontend, /window\._lastParsedResult\._artifactRevision/);
assert.match(frontend, /window\._lastParsedResult\._artifactRevision = packet\.artifactRevision/);
assert.match(frontend, /parsed\.type === 'stage'/);
assert.match(frontend, /cachePersistentInquiryState/);
assert.match(frontend, /parsed\.canonicalState === true/);
assert.match(frontend, /parsed\.type === 'canonical_complete'/);
assert.match(frontend, /renderFollowUpPacket/);
assert.match(frontend, /parsed\.type === 'state_unavailable'/);
assert.match(frontend, /STALE_INQUIRY_STATE/);
assert.match(frontend, /beginNewPersistentInquiry\(\)/);
assert.doesNotMatch(frontend, /sessionStorage\.removeItem\('qt_active_inquiry_key'\)/);

assert.match(migration, /create table if not exists public\.inquiry_states/);
assert.match(migration, /create table if not exists public\.inquiry_state_versions/);
assert.match(migration, /owner_user_id uuid null references auth\.users\(id\)/);
assert.doesNotMatch(migration, /owner_user_id uuid null references public\.subscribers\(id\)/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /p_expected_version/);
assert.match(migration, /grant select, insert, update on table public\.inquiry_states to service_role/);
assert.match(migration, /grant execute on function public\.commit_inquiry_state/);

// The initial call remains unaware of follow-up state and still omits
// isFollowUp, preserving the canonical initial handoff.
const initialCall = frontend.slice(
  frontend.indexOf('async function callProxy(messages'),
  frontend.indexOf('async function callProxyStream'),
);
assert.doesNotMatch(initialCall, /inquiryKey:/);
assert.doesNotMatch(initialCall, /isFollowUp:/);

console.log('Follow-up execution and initial-parity contract checks passed.');
