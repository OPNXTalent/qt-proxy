import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const qt = readFileSync('qt.html', 'utf8');

assert.match(qt, /margin:\s*0\.65in 0\.75in 0\.70in 0\.75in;/, 'print page should reserve physical top and bottom safe zones');
assert.match(qt, /size:\s*auto;/, 'print page should honor the selected physical paper size');
assert.match(qt, /padding-top:\s*0\.28in !important;/, 'print shell should add an internal top gutter to each fragmented page');
assert.match(qt, /padding-bottom:\s*0\.32in !important;/, 'print shell should add an internal bottom gutter to each fragmented page');
assert.match(qt, /box-decoration-break:\s*clone;/, 'print shell gutters should be cloned across page fragments');
assert.match(qt, /\.node-ctrl-btn\s*\{[\s\S]*?font-size:\s*12px;[\s\S]*?letter-spacing:\s*0\.18em;/, 'Print, Share, and Notes should share one readable action style');
assert.match(qt, /function buildNodeControls\([\s\S]*?printBtn\.addEventListener\('click',[\s\S]*?printPrism\(\)/, 'print actions should use the timestamp-aware print path');
assert.match(qt, /function printPrism\(\)[\s\S]*document\.title = 'The Prism - ' \+ prismPrintTimestamp\(new Date\(\)\)[\s\S]*window\.print\(\)/, 'print dialog should receive a unique timestamped filename');
assert.match(qt, /function prismPrintTimestamp\(date\)[\s\S]*getFullYear\(\)[\s\S]*getSeconds\(\)/, 'print filenames should include a filesystem-safe local date and time');
assert.match(qt, /#followUpSection,[\s\S]*#discussionPanel,[\s\S]*display:\s*none !important;/, 'empty interactive containers must not leak rules or blank pages into print');
assert.match(qt, /\.disclaimer\s*\{[\s\S]*?text-align:\s*left;/, 'the prose disclaimer should remain left-aligned on screen and in print');
assert.doesNotMatch(qt, /onclick="window\.print\(\)"/, 'blocking inline print handler should be removed');

console.log('Print layout, page gutters, Print action styling, and deferred interaction regression passed.');
