import { readFileSync, writeFileSync } from 'node:fs';

function replaceExact(source, before, after, marker) {
  const count = source.split(before).length - 1;
  if (count === 1) return source.replace(before, after);
  if (source.includes(marker)) return source;
  throw new Error(`${marker}: expected one source match, found ${count}`);
}

let qt = readFileSync('qt.html', 'utf8');

qt = replaceExact(
  qt,
  String.raw`              acceptInquiryCredential(parsed);
              if (parsed.threadId) activeThreadId = parsed.threadId;
              document.getElementById('subjectText').textContent = rawQuery || currentSubject || '';`,
  String.raw`              acceptInquiryCredential(parsed);
              if (parsed.threadId) {
                activeThreadId = parsed.threadId;
                // Canonical completion is the persistence milestone. Surface the
                // durable thread immediately while deeper Prism Analysis continues.
                showSidebarAfterQuery(rawQuery || currentSubject || '', parsed.threadId, progressiveResult);
              }
              document.getElementById('subjectText').textContent = rawQuery || currentSubject || '';`,
  'Canonical completion is the persistence milestone',
);

qt = replaceExact(
  qt,
  String.raw`              acceptInquiryCredential(parsed);
            } else if (parsed.type === 'delta' && parsed.text) {`,
  String.raw`              acceptInquiryCredential(parsed);
              if (parsed.threadId) {
                activeThreadId = parsed.threadId;
                showSidebarAfterQuery(rawQuery || currentSubject || '', parsed.threadId, progressiveResult);
              }
            } else if (parsed.type === 'delta' && parsed.text) {`,
  "showSidebarAfterQuery(rawQuery || currentSubject || '', parsed.threadId, progressiveResult);",
);

qt = replaceExact(
  qt,
  '    showSidebarAfterQuery(queryText, activeThreadId);',
  '    showSidebarAfterQuery(queryText, activeThreadId, parsed);',
  'showSidebarAfterQuery(queryText, activeThreadId, parsed);',
);

qt = replaceExact(
  qt,
  String.raw`function addThreadToSidebar(queryText, threadId) {
  var tsNow = Date.now(), tempId = 'pending-' + tsNow;
  var id = threadId || tempId;
  allThreads.unshift({ id: id, title: queryText.length > 60 ? queryText.slice(0, 60) + '\u2026' : queryText,
    query: queryText, lastVisited: formatNow(), createdAt: tsNow,
    daysLeft: TIER_RETENTION[CURRENT_TIER] || 90, expired: false, response: null });
  activeThreadId = id;
  renderThreads(allThreads);`,
  String.raw`function addThreadToSidebar(queryText, threadId, responseData) {
  var tsNow = Date.now(), tempId = 'pending-' + tsNow;
  var id = threadId || tempId;
  var existingIndex = allThreads.findIndex(function(thread) { return thread.id === id; });
  var existing = existingIndex >= 0 ? allThreads[existingIndex] : null;
  var safeQuery = queryText || (existing ? existing.query : '') || '';
  var title = existing && existing.title
    ? existing.title
    : (safeQuery.length > 60 ? safeQuery.slice(0, 60) + '\u2026' : safeQuery);
  var record = Object.assign({}, existing || {}, {
    id: id,
    title: title,
    query: safeQuery,
    lastVisited: formatNow(),
    createdAt: existing && existing.createdAt ? existing.createdAt : tsNow,
    daysLeft: existing && existing.daysLeft != null ? existing.daysLeft : (TIER_RETENTION[CURRENT_TIER] || 90),
    expired: existing ? !!existing.expired : false,
    response: responseData || (existing ? existing.response : null) || null
  });
  // Canonical and enrichment milestones share one durable Archive row.
  if (existingIndex >= 0) allThreads.splice(existingIndex, 1);
  allThreads.unshift(record);
  activeThreadId = id;
  renderThreads(allThreads);`,
  'function addThreadToSidebar(queryText, threadId, responseData)',
);

qt = replaceExact(
  qt,
  String.raw`  if (threadId) {
    localStorage.setItem('qt_last_thread_id', threadId);
    if (typeof startFollowUpRealtime === 'function') {`,
  String.raw`  if (threadId) {
    localStorage.setItem('qt_last_thread_id', threadId);
    if (responseData) {
      try {
        localStorage.setItem('qt_response_' + threadId, JSON.stringify(responseData));
        localStorage.setItem('qt_input_' + threadId, safeQuery);
      } catch (_) {}
    }
    if (typeof startFollowUpRealtime === 'function') {`,
  "localStorage.setItem('qt_response_' + threadId, JSON.stringify(responseData));",
);

qt = replaceExact(
  qt,
  'function showSidebarAfterQuery(queryText, threadId) {',
  'function showSidebarAfterQuery(queryText, threadId, responseData) {',
  'function showSidebarAfterQuery(queryText, threadId, responseData)',
);

qt = replaceExact(
  qt,
  '  addThreadToSidebar(queryText, threadId);\n}\n\n// TOGGLE SIDEBAR',
  '  addThreadToSidebar(queryText, threadId, responseData);\n}\n\n// TOGGLE SIDEBAR',
  'addThreadToSidebar(queryText, threadId, responseData);',
);

writeFileSync('qt.html', qt);

let interpret = readFileSync('api/interpret.js', 'utf8');
interpret = replaceExact(
  interpret,
  String.raw`  const rawCoreText = await callInquiryModel({
    model: 'claude-sonnet-4-6',
    maxTokens: 1800,
    temperature: 0.2,
    timeoutMs: 45000,
    system: progressiveSystemPrompt(systemPrompt, PRISM_ARTIFACT_CORE_CONTRACT),
    prompt: query,
  });
  let rawCore;
  try {
    rawCore = parseModelJson(rawCoreText);`,
  String.raw`  let rawCoreText = '';
  let rawCore = null;
  try {
    rawCoreText = await callInquiryModel({
      model: 'claude-sonnet-4-6',
      maxTokens: 1800,
      temperature: 0.2,
      timeoutMs: 45000,
      system: progressiveSystemPrompt(systemPrompt, PRISM_ARTIFACT_CORE_CONTRACT),
      prompt: query,
    });
  } catch (error) {
    const recoveryCode = error?.message;
    const isTruncation = recoveryCode === 'INQUIRY_MODEL_OUTPUT_TRUNCATED';
    const isTimeout = recoveryCode === 'INQUIRY_MODEL_TIMEOUT';
    if (!isTruncation && !isTimeout) throw error;
    const recovery = isTimeout ? 'timeout_retry' : 'truncation_retry';
    const retryStartEvent = isTimeout ? 'artifact_timeout_retry_start' : 'artifact_truncation_retry_start';
    const retryCompleteEvent = isTimeout ? 'artifact_timeout_retry_complete' : 'artifact_truncation_retry_complete';
    timing(retryStartEvent, { maxTokens: 3600, timeoutMs: 90000 });
    rawCore = await callInquiryModel({
      model: 'claude-sonnet-4-6',
      maxTokens: 3600,
      temperature: 0.2,
      timeoutMs: 90000,
      system: progressiveSystemPrompt(systemPrompt, PRISM_ARTIFACT_CORE_CONTRACT),
      prompt: query,
      structuredOutputSchema: PRISM_ARTIFACT_CORE_SCHEMA,
      structuredOutputName: 'emit_interpretation_artifact',
      structuredOutputDiagnostic: diagnostic => timing('artifact_structured_output_diagnostic', {
        ...diagnostic,
        recovery,
      }),
    });
    timing(retryCompleteEvent, {
      artifactChars: JSON.stringify(rawCore).length,
      boundary: 'forced_tool_schema',
      recovery,
    });
  }
  try {
    if (!rawCore) rawCore = parseModelJson(rawCoreText);`,
  'artifact_timeout_retry_start',
);
writeFileSync('api/interpret.js', interpret);

const requiredQt = [
  "showSidebarAfterQuery(rawQuery || currentSubject || '', parsed.threadId, progressiveResult);",
  'function addThreadToSidebar(queryText, threadId, responseData)',
  'allThreads.splice(existingIndex, 1);',
  'showSidebarAfterQuery(queryText, activeThreadId, parsed);',
];
for (const marker of requiredQt) {
  if (!qt.includes(marker)) throw new Error(`Missing qt.html regression marker: ${marker}`);
}
const requiredInterpret = [
  "recoveryCode === 'INQUIRY_MODEL_OUTPUT_TRUNCATED'",
  "recoveryCode === 'INQUIRY_MODEL_TIMEOUT'",
  "'artifact_timeout_retry_start'",
  "'artifact_truncation_retry_start'",
  'timeoutMs: 90000',
  'structuredOutputSchema: PRISM_ARTIFACT_CORE_SCHEMA',
  "structuredOutputName: 'emit_interpretation_artifact'",
];
for (const marker of requiredInterpret) {
  if (!interpret.includes(marker)) throw new Error(`Missing interpret regression marker: ${marker}`);
}

console.log('Runtime Archive repair applied and source assertions passed.');