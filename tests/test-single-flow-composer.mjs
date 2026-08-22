import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const frontend = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');

assert.equal(
  (frontend.match(/<textarea\b[^>]*class="input-field"/g) || []).length,
  1,
  'The query experience must expose one input-field textarea',
);
assert.match(
  frontend,
  /id="queryComposer"[\s\S]*id="userInput"[\s\S]*onclick="submitComposer\(\)"/,
  'The opening query must use the shared composer',
);
assert.doesNotMatch(
  frontend,
  /id="followUpInput"|id="followUpBtn"|id="followUpMicBtn"/,
  'A second follow-up composer must not return',
);
assert.match(
  frontend,
  /function showFollowUpComposer\(\)[\s\S]*section\.appendChild\(composer\)/,
  'The shared composer must move below the result flow',
);
assert.match(
  frontend,
  /function showOpeningComposer\(\)[\s\S]*slot\.appendChild\(composer\)/,
  'New Subject must restore the same composer to the opening position',
);
assert.match(
  frontend,
  /function submitComposer\(\)[\s\S]*composer\.dataset\.mode === 'followUp'[\s\S]*runFollowUp\(\)[\s\S]*runInterpretation\(\)/,
  'Submission behavior must follow the explicit composer mode',
);
assert.match(
  frontend,
  /function stageComposerBelowResponse\(\)[\s\S]*section\.appendChild\(composer\)[\s\S]*async function runInterpretation\(\)[\s\S]*stageComposerBelowResponse\(\)[\s\S]*loadingBlock/,
  'The composer must move below the response as soon as interpretation begins',
);
assert.match(
  frontend,
  /function positionSharingBelowComposer\(section\)[\s\S]*section\.appendChild\(governance\)/,
  'Sharing controls must be positioned beneath the shared composer',
);
assert.match(
  frontend,
  /function showFollowUpComposer\(\)[\s\S]*section\.appendChild\(composer\)[\s\S]*positionSharingBelowComposer\(section\)/,
  'The composer and sharing controls must remain at the end of the progression',
);
assert.match(
  frontend,
  /id="queryPrintBtn"[\s\S]*onclick="requestAnimationFrame\(\(\) => setTimeout\(\(\) => window\.print\(\), 0\)\)"[\s\S]*>Print<\/button>/,
  'Print must remain available beneath the composer without blocking the click handler',
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
