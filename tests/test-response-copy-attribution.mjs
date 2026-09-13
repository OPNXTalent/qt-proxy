import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const frontend = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const start = frontend.indexOf('function initResponseCopyAttribution()');
const end = frontend.indexOf('// ── Response highlighting', start);
assert.ok(start >= 0 && end > start, 'Response copy attribution flow must exist');
const flow = frontend.slice(start, end);

assert.match(flow, /document\.addEventListener\('copy'/, 'The browser copy event must drive attribution');
assert.match(
  flow,
  /if \(!resultContent\.contains\(range\.commonAncestorContainer\)\) return;/,
  'Copying outside a rendered Prism answer must remain untouched',
);
assert.match(
  flow,
  /var sourceUrl = 'https:\/\/theprism\.io';/,
  'Copied answers must use the stable public Prism URL rather than a private thread URL',
);
assert.match(
  flow,
  /setData\('text\/plain', selectedText \+ '\\n\\n' \+ sourceText\)/,
  'Plain-text pastes must include the compact Prism reference',
);
assert.match(flow, /setData\('text\/html'/, 'Rich-text pastes must retain a linked Prism reference');
assert.match(flow, /event\.preventDefault\(\)/, 'Attributed clipboard content must replace only the selected response copy');

console.log('Response copy attribution checks passed.');
