import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const progressive = readFileSync('lib/prompt-modules/progressive-inquiry.js', 'utf8');
const runtime = readFileSync('lib/persistent-inquiry-runtime.js', 'utf8');
const qt = readFileSync('qt.html', 'utf8');

assert.match(
  progressive,
  /Use semantic paragraphing whenever the response develops more than one material thought/,
  'initial canonical responses should be generated with semantic paragraph structure',
);
assert.match(
  progressive,
  /Most paragraphs should be roughly 2–5 sentences/,
  'initial response contract should preserve readable paragraph scale without forcing fragments',
);
assert.match(
  progressive,
  /Never collapse a long response into one contiguous block/,
  'initial response contract should explicitly reject wall-of-text output',
);

assert.match(
  runtime,
  /Use semantic paragraphing whenever the response carries more than one material thought/,
  'follow-up drafts should use the same semantic paragraph discipline',
);
assert.match(
  runtime,
  /Preserve meaningful paragraph breaks/,
  'the audit pass should preserve or restore paragraph structure rather than flattening it',
);

assert.match(
  qt,
  /var coreParagraphs = String\(d\.core_insight\)\.split\(\/\\n\\s\*\\n\/\)/,
  'final canonical render should split model-provided blank-line paragraph boundaries',
);
assert.match(
  qt,
  /\.qt-core-insight p \+ p \{\s*margin-top:\s*1\.05em;/,
  'canonical paragraphs should have visible breathing room between them',
);
assert.match(
  qt,
  /bodyText\.split\(\/\\n\\n\/\)/,
  'saved follow-up rendering should continue to preserve paragraph boundaries',
);

console.log('Semantic paragraph generation and rendering regression passed.');
