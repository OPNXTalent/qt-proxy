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
  /function showResult\(preserveScroll\)[\s\S]*if \(!preserveScroll\)/,
  'Result rendering must support preserving the reading position',
);
assert.match(
  frontend,
  /async function runInterpretation\(\)[\s\S]*renderResult\(parsed\)[\s\S]*showResult\(true\)/,
  'A completed live query must preserve its reading position',
);

const addThreadStart = frontend.indexOf('function addThreadToSidebar(queryText) {');
const addThreadEnd = frontend.indexOf('// SHOW SIDEBAR AFTER QUERY', addThreadStart);
const addThreadFlow = frontend.slice(addThreadStart, addThreadEnd);
assert.doesNotMatch(
  addThreadFlow,
  /typeof selectThread|selectThread\(allThreads/,
  'Archive refresh must not rerender and hide a just-completed response',
);
assert.match(
  addThreadFlow,
  /activeThreadId === tempId[\s\S]*qt_response_[\s\S]*startFollowUpRealtime\(realId\)/,
  'Archive refresh must migrate the local response and start Realtime without rerendering',
);

console.log('Single-flow composer contract checks passed.');
