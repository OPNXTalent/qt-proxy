import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const qtSource = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const gatewaySource = readFileSync(new URL('../qt-gateway.html', import.meta.url), 'utf8');

assert.doesNotMatch(
  qtSource,
  /function buildPrompt\(/,
  'The frontend must not maintain a second interpretation prompt',
);
assert.doesNotMatch(
  qtSource,
  /Return this exact JSON:/,
  'A stale frontend schema must not compete with the backend output contract',
);
assert.match(
  qtSource,
  /conversationHistory\.push\(\{ role: 'user', content: input \}\)/,
  'The initial user message must preserve the original query verbatim',
);
assert.match(
  qtSource,
  /The backend owns the Constitution and output contract/,
  'Ownership of interpretation instructions must remain explicit',
);
assert.match(
  qtSource,
  /client\.auth\.getSession\(\)/,
  'Browser and installed PWA requests must obtain the active Supabase session',
);
assert.match(
  qtSource,
  /headers\.Authorization = 'Bearer ' \+ token/,
  'Authenticated interpretation requests must send the access token in a header',
);
assert.match(
  gatewaySource,
  /key\.startsWith\('sb-'\) && key\.endsWith\('-auth-token'\)/,
  'Post-login cleanup must preserve the verified Supabase session token',
);
const preflightSource = qtSource.match(
  /async function runPreflightCheck\(\)[\s\S]*?async function handleCreditsAdded\(\)/,
)?.[0] || '';
assert.match(
  preflightSource,
  /previewTestAccess = data\.previewTestAccess === true;\s*releaseServerAuthorizedPreviewLock\(\);[\s\S]*?if \(!previewTestAccess && data\.locked\)/,
  'The startup quota wall must be released after a server-authorized Preview test entitlement resolves',
);
assert.match(
  qtSource,
  /function releaseServerAuthorizedPreviewLock\(\) \{[\s\S]*?if \(!previewTestAccess\) return;[\s\S]*?submitBtn\.style\.display = '';[\s\S]*?newSubjectBtn\.style\.display = '';/,
  'Preview lock release must be guarded by the server-derived entitlement flag',
);
assert.doesNotMatch(
  qtSource.match(/async function callProxyStream[\s\S]*?async function callProxy\(/)?.[0] || '',
  /email:\s*userEmail/,
  'The streaming request must not transmit local email as authorization identity',
);
assert.doesNotMatch(
  qtSource.match(/async function callProxy\([\s\S]*?function getErrorMessage/)?.[0] || '',
  /email:\s*userEmail/,
  'The initial request must not transmit local email as authorization identity',
);
assert.match(
  qtSource.match(/async function runFollowUp\(\)[\s\S]*?\/\/ Experimental theodicy module switch/)?.[0] || '',
  /catch \(err\) \{[\s\S]*?const errEl = document\.createElement\('div'\);[\s\S]*?errEl\.innerHTML = getErrorMessage\(err\)/,
  'Follow-up failures must render through an error element created inside the catch path',
);

console.log('Frontend query handoff checks passed.');
