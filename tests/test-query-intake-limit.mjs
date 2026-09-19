import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const frontend = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const api = readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');

for (const id of ['userInput', 'followUpInput', 'sharedComposerInput']) {
  assert.match(
    frontend,
    new RegExp(`id="${id}"[^>]*maxlength="4000"`),
    `${id} must accept the canonical 4,000-character inquiry limit`,
  );
}

assert.match(frontend, /<span id="charNum">0<\/span> \/ 4000/);
assert.match(frontend, /len > Math\.floor\(limit \* 0\.85\)/);
assert.match(api, /const MAX_QUERY_CHARS = 4000;/);
assert.match(api, /body\.inquirySubject\.slice\(0, MAX_QUERY_CHARS\)/);
assert.match(api, /lastUserText\.length > MAX_QUERY_CHARS/);
assert.match(api, /res\.status\(413\)\.json/);

console.log('Query intake limit contract checks passed.');
