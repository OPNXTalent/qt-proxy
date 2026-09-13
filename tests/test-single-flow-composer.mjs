import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const frontend = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');

assert.match(
  frontend,
  /\.node-controls\s*\{[\s\S]*?justify-content:\s*space-between;[\s\S]*?width:\s*100%;[\s\S]*?\}/,
  'Print, Share, and Notes must span every response width',
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
  /id="followUpComposer"[\s\S]*id="followUpInput"[\s\S]*class="follow-up-submit-row"[\s\S]*id="newSubjectBottomBtn" onclick="resetForm\(\)"[\s\S]*id="followUpSubmitBtn" onclick="runFollowUp\(document\.getElementById\('followUpInput'\)\)"/,
  'The completed-answer composer must place New Subject and Enter on the same row',
);
assert.match(
  frontend,
  /\.follow-up-submit-row\s*\{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*space-between;/,
  'The follow-up action buttons must sit at opposite ends of their row',
);
assert.match(
  frontend,
  /\.disclaimer\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*none;[\s\S]*?text-align:\s*left;[\s\S]*?\}/,
  'The disclaimer must be left aligned across the full question width',
);
assert.match(
  frontend,
  /function showFollowUpComposer\(\)[\s\S]*followUpComposer\.style\.display = 'block'/,
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
  /function showFollowUpComposer\(\)[\s\S]*openingInput\.readOnly = true[\s\S]*submitBtn'\)\.style\.display = 'none'/,
  'A completed question must become read-only and hide the dead Interpret control',
);
assert.match(
  frontend,
  /followUpInput'\)\.addEventListener\('keydown'[\s\S]*runFollowUp\(this\)/,
  'Enter in the empty follow-up field must submit the next question',
);
assert.doesNotMatch(
  frontend,
  /id="sessionGovernance"|id="queryPrintBtn"|id="queryShareActionBtn"|id="queryNotesActionBtn"/,
  'A movable singleton Query action row must not exist',
);

const nodeControlsStart = frontend.indexOf('function buildNodeControls(nodeId, queryText) {');
const nodeControlsEnd = frontend.indexOf('function focusRefractionNode(', nodeControlsStart);
const nodeControlsFlow = frontend.slice(nodeControlsStart, nodeControlsEnd);
assert.match(
  nodeControlsFlow,
  /node-print-btn[\s\S]*textContent = 'Print'[\s\S]*printPrism\(\)/,
  'Every Refraction must offer a Print action for the entire exchange',
);
assert.match(
  nodeControlsFlow,
  /node-share-btn[\s\S]*textContent = 'Share'[\s\S]*openShareSurface\(nodeId, queryText\)/,
  'Every Refraction must open Share at its own response node',
);
assert.match(
  nodeControlsFlow,
  /node-refraction-btn[\s\S]*textContent = 'Notes'[\s\S]*openNotesSurface\(nodeId, queryText\)/,
  'Every Refraction must open Notes at its own response node',
);
assert.match(
  frontend,
  /function renderResult\(d\)[\s\S]*resultContent\.innerHTML = html;[\s\S]*resultContent\.appendChild\(buildNodeControls\('root', currentSubject \|\| d\._subject \|\| ''\)\)/,
  'The original Query must own a permanent response-scoped action row',
);
assert.match(
  frontend,
  /function openNotesSurface\([\s\S]*openNodeSurface\([\s\S]*'private'[\s\S]*function openShareSurface\(nodeId, queryText\)[\s\S]*openNodeSurface\(targetNodeId, targetQuery, 'trust_circle'\)/,
  'Notes and Share must preserve their response node while opening the corresponding view',
);
assert.match(
  frontend,
  /nodeId:\s*_activeNodeId/,
  'Trust Circle messages must be written within the active response node',
);
assert.match(
  frontend,
  /return \(m\.node_id \|\| 'root'\) === _activeNodeId/,
  'Loaded Trust Circle messages must be filtered to the active response node',
);
assert.match(
  frontend,
  /\(msg\.node_id \|\| 'root'\) !== _activeNodeId/,
  'Realtime Trust Circle messages must be filtered to the active response node',
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
