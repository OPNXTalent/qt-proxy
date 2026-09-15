import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const frontend = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const shareRedirect = readFileSync(new URL('../share.html', import.meta.url), 'utf8');

assert.match(
  frontend,
  /name="viewport" content="width=device-width, initial-scale=1\.0, viewport-fit=cover, interactive-widget=resizes-content"/,
  'The mobile viewport must allow recovery from browser magnification',
);
assert.doesNotMatch(
  frontend.slice(0, frontend.indexOf('<title>')),
  /maximum-scale|user-scalable/,
  'Shared-query startup must not lock someone inside a restored magnified viewport',
);
assert.match(
  shareRedirect,
  /name="viewport" content="width=device-width, initial-scale=1\.0, viewport-fit=cover"/,
  'The compatibility redirect must preserve user-controlled viewport recovery',
);
assert.match(
  shareRedirect,
  /var entryId = Date\.now\(\)\.toString\(36\);[\s\S]*window\.location\.replace\('\/qt\.html\?mode=anon&t=' \+ encodeURIComponent\(token\) \+ '&entry=' \+ entryId\)/,
  'Each compatibility redirect must use a fresh destination while preserving the share token',
);
assert.match(
  frontend,
  /function prepareSharedQueryEntry\(\)[\s\S]*params\.get\('t'\)[\s\S]*history\.scrollRestoration = 'manual'[\s\S]*pointerdown[\s\S]*userRequestedEditableFocus = true[\s\S]*focusin[\s\S]*event\.target\.blur\(\)[\s\S]*pageshow/,
  'Shared-query startup must reject restored field focus until a real editable-control tap occurs',
);
assert.match(
  frontend,
  /function unlockGatedField\(field\)[\s\S]*field\.readOnly = false;[\s\S]*field\.setAttribute\('inputmode', field\.dataset\.prismFocusGated[\s\S]*if \(!params\.get\('t'\)\)[\s\S]*unlockAllGatedFields/,
  'Ordinary pages must unlock the static focus gate while shared pages wait for a real tap',
);
assert.match(
  frontend,
  /pointerdown[\s\S]*event\.target\.id === 'userInput'[\s\S]*unlockGatedField\(event\.target\)/,
  'A real tap must unlock shared follow-up and discussion fields without making the immutable root question editable',
);
for (const id of ['userInput', 'followUpInput', 'chatInput']) {
  assert.match(
    frontend,
    new RegExp(`id="${id}"[^>]+inputmode="none"[^>]+data-prism-focus-gated="text"[^>]+readonly`),
    `${id} must be keyboard-inert in static HTML so Android cannot restore startup focus`,
  );
}
assert.match(
  frontend,
  /@media \(max-width: 600px\)[\s\S]*?textarea\.input-field,[\s\S]*?font-size:\s*18px !important;/,
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
const composerStabilizer = frontend.slice(
  frontend.indexOf('function stabilizeMobileComposerInput(input)'),
  frontend.indexOf('function stageComposerBelowResponse()'),
);
assert.match(
  composerStabilizer,
  /keydown[\s\S]*?event\.stopPropagation\(\)[\s\S]*?keyup[\s\S]*?event\.stopPropagation\(\)/,
  'Composer keyboard events must remain isolated from page-level shortcuts',
);
assert.doesNotMatch(
  composerStabilizer,
  /\.focus\(/,
  'Mobile composer stabilization must never reopen the keyboard after it is dismissed',
);
assert.match(
  composerStabilizer,
  /touchSurface[\s\S]*?pointermove[\s\S]*?gestureMoved = true[\s\S]*?releaseCompactTouchKeyboard\(input\)/,
  'A vertical swipe across the composer surface must release keyboard focus',
);
assert.match(
  frontend,
  /textarea\.input-field,[\s\S]*?textarea\.chat-input \{ touch-action: pan-y; \}/,
  'Mobile textarea surfaces must hand vertical gestures to page scrolling',
);
assert.match(
  frontend,
  /function closeDiscussionPanel\(\)[\s\S]*?panel\.contains\(active\)[\s\S]*?releaseCompactTouchKeyboard\(active\)[\s\S]*?panel\.classList\.remove\('open'\)/,
  'Closing the shared discussion must release its focused keyboard before hiding the panel',
);
assert.match(
  frontend,
  /stabilizeMobileComposerInput\(document\.getElementById\('followUpInput'\)\)[\s\S]*?stabilizeMobileComposerInput\(document\.getElementById\('chatInput'\)\)/,
  'Both recipient text composers must install the mobile typing guard',
);
assert.match(
  frontend,
  /id="followUpInput"[^>]+autocapitalize="sentences"[^>]+autocorrect="on"[^>]+spellcheck="true"/,
  'The follow-up composer must request sentence-aware mobile keyboard behavior',
);
assert.match(
  frontend,
  /id="chatInput"[^>]+autocapitalize="sentences"[^>]+autocorrect="on"[^>]+spellcheck="true"/,
  'The shared conversation composer must request sentence-aware mobile keyboard behavior',
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
