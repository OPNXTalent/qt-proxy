import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractCompleteJsonString } from '../lib/stream-json.js';

const recognition = 'He asked, "why?" A backslash \\\\ and א remain intact.';
const response = JSON.stringify({
  recognition,
  core_insight: 'The rest of the response is still streaming.',
});
const recognitionToken = JSON.stringify(recognition);
const completionPoint = response.indexOf(recognitionToken) + recognitionToken.length;

for (let length = 0; length < completionPoint; length++) {
  assert.deepEqual(
    extractCompleteJsonString(response.slice(0, length), 'recognition'),
    { status: 'pending' },
    `Recognition must remain pending at prefix length ${length}`,
  );
}

for (let length = completionPoint; length <= response.length; length++) {
  assert.deepEqual(
    extractCompleteJsonString(response.slice(0, length), 'recognition'),
    { status: 'complete', value: recognition },
    `Recognition must be available once its closing quote arrives (${length})`,
  );
}

assert.deepEqual(
  extractCompleteJsonString(
    '{"other":"{\\"recognition\\":\\"trap\\"}","recognition":"real value","tail":"pending',
    'recognition',
  ),
  { status: 'complete', value: 'real value' },
  'Key-shaped text inside another string must be ignored',
);

assert.deepEqual(
  extractCompleteJsonString(
    'preface says "recognition": "not JSON" before {"recognition":"inside object"}',
    'recognition',
  ),
  { status: 'complete', value: 'inside object' },
  'Key-shaped prose outside the root object must be ignored',
);

assert.deepEqual(
  extractCompleteJsonString(
    '{"nested":{"recognition":"nested value"},"recognition":"root value"}',
    'recognition',
  ),
  { status: 'complete', value: 'root value' },
  'Only the root response field may be exposed',
);

assert.deepEqual(
  extractCompleteJsonString('{"recognition":"line one\nline two"}', 'recognition'),
  { status: 'invalid' },
  'Invalid JSON strings must fall back to the waiting screen',
);

assert.deepEqual(
  extractCompleteJsonString('{"recognition":{"text":"not a string"}}', 'recognition'),
  { status: 'invalid' },
  'Non-string recognition values must not render early',
);

assert.deepEqual(
  extractCompleteJsonString('{"recognition":"unfinished escape\\', 'recognition'),
  { status: 'pending' },
  'A trailing escape must not be mistaken for a closing quote',
);

const qtSource = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
assert.match(
  qtSource,
  /<script type="module" src="\/lib\/stream-json\.js"><\/script>/,
  'The browser must load the tested extractor module',
);
assert.equal(
  (qtSource.match(/fullText \+= parsed\.text;\s+considerEarlyRecognition\(\);/g) || []).length,
  2,
  'Both initial-query SSE parsing paths must consider early Recognition',
);
assert.match(
  qtSource,
  /escHtml\(recognition\.trim\(\)\)/,
  'Early Recognition must be HTML escaped before rendering',
);
assert.match(
  qtSource,
  /recognition_extraction_invalid/,
  'Extraction failure must be observable while retaining the safe fallback',
);

console.log('Streaming Recognition extraction checks passed.');
