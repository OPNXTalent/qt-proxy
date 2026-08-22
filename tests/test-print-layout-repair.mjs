import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const qt = readFileSync('qt.html', 'utf8');

assert.match(qt, /margin:\s*0\.65in 0\.75in 0\.70in 0\.75in;/, 'print page should reserve physical top and bottom safe zones');
assert.match(qt, /size:\s*auto;/, 'print page should honor the selected physical paper size');
assert.match(qt, /padding-top:\s*0\.28in !important;/, 'print shell should add an internal top gutter to each fragmented page');
assert.match(qt, /padding-bottom:\s*0\.32in !important;/, 'print shell should add an internal bottom gutter to each fragmented page');
assert.match(qt, /box-decoration-break:\s*clone;/, 'print shell gutters should be cloned across page fragments');
assert.match(qt, /#queryPrintBtn\s*\{[\s\S]*?font-size:\s*12px;[\s\S]*?letter-spacing:\s*0\.18em;[\s\S]*?color:\s*var\(--gold-pale\);/, 'Print action should match Share This scale and Ask/Interpret color');
assert.match(qt, /requestAnimationFrame\(\(\) => setTimeout\(\(\) => window\.print\(\), 0\)\)/, 'print dialog should be dispatched after the click handler returns');
assert.doesNotMatch(qt, /onclick="window\.print\(\)"/, 'blocking inline print handler should be removed');

console.log('Print layout, page gutters, Print action styling, and deferred interaction regression passed.');
