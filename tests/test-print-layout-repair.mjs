import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const qt = readFileSync('qt.html', 'utf8');

assert.match(qt, /margin:\s*1in 0\.75in 1in 0\.75in;/, 'print page should reserve one-inch top and bottom safe zones');
assert.match(qt, /size:\s*auto;/, 'print page should honor the selected physical paper size');
assert.match(qt, /requestAnimationFrame\(\(\) => setTimeout\(\(\) => window\.print\(\), 0\)\)/, 'print dialog should be dispatched after the click handler returns');
assert.doesNotMatch(qt, /onclick="window\.print\(\)"/, 'blocking inline print handler should be removed');

console.log('Print layout and deferred print interaction regression passed.');
