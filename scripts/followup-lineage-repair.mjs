import { readFileSync, writeFileSync } from 'node:fs';

function replaceExact(source, before, after, marker) {
  const count = source.split(before).length - 1;
  if (count === 1) return source.replace(before, after);
  if (source.includes(marker)) return source;
  throw new Error(`${marker}: expected one source match, found ${count}`);
}

let interpret = readFileSync('api/interpret.js', 'utf8');

interpret = replaceExact(
  interpret,
  String.raw`async function restoreCanonicalInquiryState({
  inquiryKey,
  threadId,
  subject,
  artifactId,
  artifactRevision,
  ownerUserId,
}) {
  const fallback = createInitialInquiryState(subject);`,
  String.raw`async function restoreCanonicalInquiryState({
  inquiryKey,
  threadId,
  subject,
  artifactId,
  artifactRevision,
  ownerUserId,
  inquiryToken,
}) {
  const fallback = createInitialInquiryState(subject);`,
  "ownerUserId,\n  inquiryToken,\n}) {\n  const fallback = createInitialInquiryState(subject);",
);

interpret = replaceExact(
  interpret,
  String.raw`    const candidate = artifactRows?.[0];
    const threadMatches = !candidate?.thread_id || candidate.thread_id === threadId;
    const ownerMatches = Boolean(ownerUserId) && candidate?.owner_user_id === ownerUserId;
    if (!candidate || !threadMatches || !ownerMatches) {
      throw new Error('FOLLOWUP_ARTIFACT_LINEAGE_INVALID');
    }
    lineageArtifact = candidate;
    inquiryKey = candidate.inquiry_key;`,
  String.raw`    const candidate = artifactRows?.[0];
    const threadMatches = !candidate?.thread_id || candidate.thread_id === threadId;
    const authenticatedOwnerMatches = Boolean(candidate?.owner_user_id)
      && Boolean(ownerUserId)
      && candidate.owner_user_id === ownerUserId;
    // Anonymous lineage is authenticated by the signed inquiry credential that
    // was issued with the canonical artifact. Ownerless artifacts must never be
    // rejected merely because there is no Supabase user id.
    const anonymousCredentialMatches = Boolean(candidate)
      && !candidate.owner_user_id
      && candidate.inquiry_key === inquiryKey
      && verifyInquiryCredential(candidate.inquiry_key, inquiryToken);
    const lineageMatches = authenticatedOwnerMatches || anonymousCredentialMatches;
    if (!candidate || !threadMatches || !lineageMatches) {
      throw new Error('FOLLOWUP_ARTIFACT_LINEAGE_INVALID');
    }
    lineageArtifact = candidate;
    inquiryKey = candidate.inquiry_key;`,
  'Anonymous lineage is authenticated by the signed inquiry credential',
);

interpret = replaceExact(
  interpret,
  String.raw`async function runPersistentInquiryFollowUp({
  sse,
  timing,
  requestId,
  input,
  subject,
  inquiryKey,
  threadId,
  ownerUserId,
  tier,
  artifactId,
  artifactRevision,
  isClientAborted = () => false,
}) {`,
  String.raw`async function runPersistentInquiryFollowUp({
  sse,
  timing,
  requestId,
  input,
  subject,
  inquiryKey,
  inquiryToken,
  threadId,
  ownerUserId,
  tier,
  artifactId,
  artifactRevision,
  isClientAborted = () => false,
}) {`,
  "inquiryKey,\n  inquiryToken,\n  threadId,\n  ownerUserId,\n  tier,",
);

interpret = replaceExact(
  interpret,
  String.raw`  const restored = await restoreCanonicalInquiryState({
    inquiryKey,
    threadId,
    subject,
    artifactId,
    artifactRevision,
    ownerUserId,
  });`,
  String.raw`  const restored = await restoreCanonicalInquiryState({
    inquiryKey,
    threadId,
    subject,
    artifactId,
    artifactRevision,
    ownerUserId,
    inquiryToken,
  });`,
  "ownerUserId,\n    inquiryToken,\n  });\n  const previousState",
);

interpret = replaceExact(
  interpret,
  String.raw`                subject: inquirySubject,
                inquiryKey: inquiryKey || ` + '`thread:${threadId || requestId}`' + String.raw`,
                threadId,
                ownerUserId: userId,`,
  String.raw`                subject: inquirySubject,
                inquiryKey: inquiryKey || ` + '`thread:${threadId || requestId}`' + String.raw`,
                inquiryToken,
                threadId,
                ownerUserId: userId,`,
  "inquiryKey: inquiryKey || `thread:${threadId || requestId}`,\n                inquiryToken,\n                threadId,\n                ownerUserId: userId,",
);

interpret = replaceExact(
  interpret,
  String.raw`            subject: inquirySubject,
            inquiryKey: inquiryKey || ` + '`thread:${threadId || requestId}`' + String.raw`,
            threadId,
            ownerUserId: null,`,
  String.raw`            subject: inquirySubject,
            inquiryKey: inquiryKey || ` + '`thread:${threadId || requestId}`' + String.raw`,
            inquiryToken,
            threadId,
            ownerUserId: null,`,
  "inquiryKey: inquiryKey || `thread:${threadId || requestId}`,\n            inquiryToken,\n            threadId,\n            ownerUserId: null,",
);

const required = [
  'Anonymous lineage is authenticated by the signed inquiry credential',
  'const anonymousCredentialMatches = Boolean(candidate)',
  'verifyInquiryCredential(candidate.inquiry_key, inquiryToken)',
  "ownerUserId,\n  inquiryToken,\n}) {\n  const fallback = createInitialInquiryState(subject);",
  "inquiryKey,\n  inquiryToken,\n  threadId,\n  ownerUserId,\n  tier,",
  "ownerUserId,\n    inquiryToken,\n  });\n  const previousState",
  "ownerUserId: userId,",
  "ownerUserId: null,",
];
for (const marker of required) {
  if (!interpret.includes(marker)) throw new Error(`Missing follow-up lineage repair marker: ${marker}`);
}

if (interpret.includes('const ownerMatches = Boolean(ownerUserId) && candidate?.owner_user_id === ownerUserId;')) {
  throw new Error('Legacy owner-only lineage gate is still present');
}

writeFileSync('api/interpret.js', interpret);
console.log('Follow-up lineage repair applied and source assertions passed.');
