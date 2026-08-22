import { readFileSync } from 'node:fs';

const source = readFileSync('api/interpret.js', 'utf8');

const required = [
  'Anonymous lineage is authenticated by the signed inquiry credential',
  'const anonymousCredentialMatches = Boolean(candidate)',
  '!candidate.owner_user_id',
  'candidate.inquiry_key === inquiryKey',
  'verifyInquiryCredential(candidate.inquiry_key, inquiryToken)',
  'const lineageMatches = authenticatedOwnerMatches || anonymousCredentialMatches;',
  "ownerUserId,\n  inquiryToken,\n}) {\n  const fallback = createInitialInquiryState(subject);",
  "inquiryKey,\n  inquiryToken,\n  threadId,\n  ownerUserId,\n  tier,",
  "ownerUserId,\n    inquiryToken,\n  });\n  const previousState",
  "inquiryKey: inquiryKey || `thread:${threadId || requestId}`,\n                inquiryToken,\n                threadId,\n                ownerUserId: userId,",
  "inquiryKey: inquiryKey || `thread:${threadId || requestId}`,\n            inquiryToken,\n            threadId,\n            ownerUserId: null,",
];

for (const marker of required) {
  if (!source.includes(marker)) {
    throw new Error(`Anonymous follow-up lineage regression: missing ${marker}`);
  }
}

const forbidden = [
  'const ownerMatches = Boolean(ownerUserId) && candidate?.owner_user_id === ownerUserId;',
];
for (const marker of forbidden) {
  if (source.includes(marker)) {
    throw new Error(`Anonymous follow-up lineage regression: forbidden legacy gate ${marker}`);
  }
}

console.log('Anonymous follow-up lineage contract passed.');
