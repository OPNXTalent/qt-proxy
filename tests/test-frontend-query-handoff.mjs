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
  /previewTestAccess = data\.previewTestAccess === true;[\s\S]*?if \(!previewTestAccess && data\.locked\)/,
  'The startup quota wall must yield to a server-authorized Preview test entitlement',
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

console.log('Frontend query handoff checks passed.');
