import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const frontend = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');

assert.match(
  frontend,
  /\.query-action-row\s*\{[\s\S]*?justify-content:\s*space-between;[\s\S]*?width:\s*100%;[\s\S]*?\}/,
  'Print, Share, and Notes must span the response width',
);
assert.doesNotMatch(
  frontend,
  /id="downloadRow"|id="shareBtn"|id="presenceDot"|id="collabToggleBtn"|id="liveSyncBtn"/,
  'The legacy Print, Shared, Discussion, Copy, and Sync strip must not return',
);
assert.match(
  frontend,
  /\.site-footer\s*\{[\s\S]*?width:\s*calc\(100% - 80px\);[\s\S]*?max-width:\s*780px;[\s\S]*?margin:\s*0 auto;/,
  'The footer must share the desktop width and centered edges of the question box',
);
assert.match(
  frontend,
  /@media \(max-width: 600px\)\s*\{\s*\.site-footer\s*\{\s*width:\s*calc\(100% - 40px\);/,
  'The footer must share the mobile width of the question box',
);

assert.equal(
  (frontend.match(/<textarea\b[^>]*class="input-field"/g) || []).length,
  2,
  'The query experience must expose opening and follow-up textareas',
);
assert.match(
  frontend,
  /id="queryComposer"[\s\S]*id="userInput"[\s\S]*onclick="submitComposer\(\)"/,
  'The opening question must retain its own composer',
);
assert.match(
  frontend,
  /id="followUpComposer"[\s\S]*id="followUpInput"[\s\S]*placeholder="Ask a follow-up question…"[\s\S]*id="followUpMicBtn"/,
  'A separate empty follow-up composer must sit at the end of a completed answer',
);
assert.match(
  frontend,
  /id="followUpComposer"[\s\S]*id="followUpInput"[\s\S]*id="newSubjectBottomBtn" onclick="resetForm\(\)"/,
  'The completed-answer composer must include a bottom New Subject control',
);
assert.match(
  frontend,
  /\.disclaimer\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*none;[\s\S]*?text-align:\s*left;[\s\S]*?\}/,
  'The disclaimer must be left aligned across the full question width',
);
assert.match(
  frontend,
  /function showFollowUpComposer\(\)[\s\S]*positionResponseActions\(section, followUpComposer\)[\s\S]*followUpComposer\.style\.display = 'block'/,
  'The completed answer must reveal its dedicated follow-up composer',
);
assert.match(
  frontend,
  /function showOpeningComposer\(\)[\s\S]*slot\.appendChild\(composer\)/,
  'New Subject must restore the same composer to the opening position',
);
assert.match(
  frontend,
  /function submitComposer\(\) \{[\s\S]*return runInterpretation\(\)/,
  'The opening composer must remain dedicated to initial interpretation',
);
assert.match(
  frontend,
  /function stageComposerBelowResponse\(\)[\s\S]*Keep the original question at the top[\s\S]*async function runInterpretation\(\)[\s\S]*stageComposerBelowResponse\(\)[\s\S]*loadingBlock/,
  'The original question must remain at the top while interpretation runs',
);
assert.match(
  frontend,
  /function positionResponseActions\(section, followUpComposer\)[\s\S]*section\.insertBefore\(governance, followUpComposer \|\| null\)/,
  'The response actions must be positioned before the follow-up composer',
);
assert.match(
  frontend,
  /function showFollowUpComposer\(\)[\s\S]*openingInput\.readOnly = true[\s\S]*submitBtn'\)\.style\.display = 'none'/,
  'A completed question must become read-only and hide the dead Interpret control',
);
assert.match(
  frontend,
  /followUpInput'\)\.addEventListener\('keydown'[\s\S]*runFollowUp\(this\)/,
  'Enter in the empty follow-up field must submit the next question',
);
assert.match(
  frontend,
  /class="query-action-row"[\s\S]*id="queryPrintBtn"[\s\S]*>Print<\/button>[\s\S]*id="queryShareActionBtn"[\s\S]*>Share<\/button>[\s\S]*id="queryNotesActionBtn"[\s\S]*>Notes<\/button>/,
  'Print, Share, and Notes must appear as one intuitive action row',
);

const nodeControlsStart = frontend.indexOf('function buildNodeControls(nodeId, queryText) {');
const nodeControlsEnd = frontend.indexOf('function focusRefractionNode(', nodeControlsStart);
const nodeControlsFlow = frontend.slice(nodeControlsStart, nodeControlsEnd);
assert.doesNotMatch(
  nodeControlsFlow,
  /node-share-btn|textContent = 'Share'|textContent = '↓ Print'/,
  'Per-response controls must omit redundant Share and Print actions',
);
assert.match(
  nodeControlsFlow,
  /textContent = _btnLabel === 'Query' \? 'Notes' : _btnLabel \+ ' Notes'/,
  'Per-response note shortcuts must use plain Notes language',
);
assert.match(
  frontend,
  /function openNotesSurface\([\s\S]*openNodeSurface\([\s\S]*'private'[\s\S]*function openShareSurface\([\s\S]*openNodeSurface\([\s\S]*'trust_circle'/,
  'Notes and Share must open their corresponding panel views directly',
);
assert.match(
  frontend,
  /function showResult\(preserveScroll\)[\s\S]*if \(!preserveScroll\)/,
  'Result rendering must support preserving the reading position',
);
assert.match(
  frontend,
  /async function runInterpretation\(\)[\s\S]*renderResult\(parsed\)[\s\S]*showResult\(true\)/,
  'A completed live query must preserve its reading position',
);

const addThreadStart = frontend.indexOf('function addThreadToSidebar(queryText, threadId, responseData) {');
const addThreadEnd = frontend.indexOf('// SHOW SIDEBAR AFTER QUERY', addThreadStart);
assert.ok(addThreadStart >= 0 && addThreadEnd > addThreadStart, 'Durable Archive handoff flow must exist');
const addThreadFlow = frontend.slice(addThreadStart, addThreadEnd);
assert.doesNotMatch(
  addThreadFlow,
  /typeof selectThread|selectThread\(allThreads/,
  'Archive refresh must not rerender and hide a just-completed response',
);
assert.match(
  addThreadFlow,
  /responseData[\s\S]*qt_response_[\s\S]*startFollowUpRealtime\(threadId\)/,
  'Canonical completion must cache the durable response and start Realtime without rerendering',
);

const initSidebarStart = frontend.indexOf('function initSidebar() {');
const initSidebarEnd = frontend.indexOf('async function handleLogout()', initSidebarStart);
assert.ok(initSidebarStart >= 0 && initSidebarEnd > initSidebarStart, 'Sidebar initialization flow must exist');
const initSidebarFlow = frontend.slice(initSidebarStart, initSidebarEnd);
assert.match(
  initSidebarFlow,
  /sidebarOpen = false[\s\S]*sidebar\.classList\.remove\('open'\)[\s\S]*mainContent\.classList\.remove\('sidebar-open'\)/,
  'Every visit must initialize Archive in its closed state',
);
assert.doesNotMatch(
  initSidebarFlow,
  /wasOpen|sidebar\.classList\.add\('open'\)|mainContent\.classList\.add\('sidebar-open'\)/,
  'Archive must not reopen itself from saved or populated state',
);
assert.match(
  initSidebarFlow,
  /if \(sessionStorage\.getItem\('prism_r1_session'\)\) \{[\s\S]*if \(!verifiedAuthState\.authenticated\) \{[\s\S]*allThreads = \[\];[\s\S]*renderThreads\(allThreads\);[\s\S]*return;[\s\S]*sessionStorage\.removeItem\('prism_r1_active'\);[\s\S]*authenticatedFetch\(API_BASE \+ '\/api\/threads'/,
  'R1 must isolate an anonymous Archive while allowing a verified account to reach the server-authoritative Archive load',
);

const applyHighlightStart = frontend.indexOf('function applyHighlight(color) {');
const applyHighlightEnd = frontend.indexOf('function buildNewSectionButton()', applyHighlightStart);
assert.ok(
  applyHighlightStart >= 0 && applyHighlightEnd > applyHighlightStart,
  'Visual response highlighting flow must exist',
);
const applyHighlightFlow = frontend.slice(applyHighlightStart, applyHighlightEnd);
assert.doesNotMatch(
  applyHighlightFlow,
  /kind=note|focusRefractionNode|toggleEntryVisibility|noteIdentityHeaders/,
  'Highlighting must not create or open Refractions automatically',
);
assert.doesNotMatch(
  frontend,
  /applyHighlightAndCreateNote/,
  'Highlight controls must use the visual-only highlighting flow',
);

console.log('Single-flow composer contract checks passed.');
