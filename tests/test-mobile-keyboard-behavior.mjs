import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const frontend = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');

assert.match(
  frontend,
  /name="viewport" content="width=device-width, initial-scale=1\.0, maximum-scale=1\.0, user-scalable=no, interactive-widget=resizes-content"/,
  'The Android in-app browser must be explicitly prevented from magnifying focused fields',
);
assert.match(
  frontend,
  /@media \(max-width: 600px\)[\s\S]*?textarea\.input-field,[\s\S]*?font-size:\s*20px !important;/,
  'Mobile composers must stay safely above browser focus-zoom thresholds',
);

assert.match(
  frontend,
  /html\s*\{[\s\S]*?-webkit-text-size-adjust:\s*100%;[\s\S]*?text-size-adjust:\s*100%;[\s\S]*?\}/,
  'Mobile browsers must preserve the intended text scale',
);

assert.match(
  frontend,
  /function usesCompactTouchKeyboard\(\)[\s\S]*?matchMedia\('\(max-width: 900px\), \(hover: none\) and \(pointer: coarse\)'\)/,
  'Compact and touch devices must be recognized without disabling user zoom',
);
assert.match(
  frontend,
  /function releaseCompactTouchKeyboard\(input\)[\s\S]*?target\.blur\(\)/,
  'The focused mobile control must be able to release the on-screen keyboard',
);

const interpretation = frontend.slice(
  frontend.indexOf('async function runInterpretation()'),
  frontend.indexOf('async function runFollowUp('),
);
assert.match(
  interpretation,
  /const inputEl = document\.getElementById\('userInput'\);[\s\S]*?releaseCompactTouchKeyboard\(inputEl\)/,
  'Submitting an opening question must dismiss the compact touch keyboard',
);

const followUp = frontend.slice(
  frontend.indexOf('async function runFollowUp('),
  frontend.indexOf('// Experimental theodicy module switch'),
);
assert.match(
  followUp,
  /releaseCompactTouchKeyboard\(inputEl\)/,
  'Submitting a follow-up must dismiss the compact touch keyboard',
);
assert.match(
  followUp,
  /if \(!usesCompactTouchKeyboard\(\)\) inputEl\.focus\(\)/,
  'A completed follow-up must restore focus on desktop only',
);
assert.doesNotMatch(
  followUp,
  /^\s*inputEl\.focus\(\);/m,
  'A completed follow-up must not force the mobile keyboard open again',
);

const trustCircleSend = frontend.slice(
  frontend.indexOf('async function sendChatMessage()'),
  frontend.indexOf('// ── Private View'),
);
assert.match(
  trustCircleSend,
  /releaseCompactTouchKeyboard\(input\)/,
  'Sending a Trust Circle message must dismiss the compact touch keyboard',
);
assert.match(
  trustCircleSend,
  /if \(!usesCompactTouchKeyboard\(\)\) input\.focus\(\)/,
  'Trust Circle compose focus must be restored on desktop only',
);

const noteTextarea = frontend.slice(
  frontend.indexOf('function buildNoteTextarea('),
  frontend.indexOf('function buildNoteBlock('),
);
assert.match(noteTextarea, /font-size:16px/, 'Note textareas must not trigger iOS focus zoom');

const noteBlocks = frontend.slice(
  frontend.indexOf('function buildNoteBlock('),
  frontend.indexOf('function scheduleNoteAutosave('),
);
assert.equal(
  (noteBlocks.match(/font-size:16px/g) || []).length >= 2,
  true,
  'Existing and new note titles must not trigger iOS focus zoom',
);

console.log('Mobile keyboard behavior checks passed.');
