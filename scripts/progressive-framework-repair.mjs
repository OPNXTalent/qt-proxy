import { readFileSync, writeFileSync } from 'node:fs';

function replaceExact(source, before, after, marker) {
  const count = source.split(before).length - 1;
  if (count === 1) return source.replace(before, after);
  if (source.includes(marker)) return source;
  throw new Error(`${marker}: expected one source match, found ${count}`);
}

function replaceBetween(source, startMarker, endMarker, replacement, doneMarker) {
  if (source.includes(doneMarker)) return source;
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${doneMarker}: start marker not found`);
  const endStart = source.indexOf(endMarker, start);
  if (endStart < 0) throw new Error(`${doneMarker}: end marker not found`);
  const end = endStart + endMarker.length;
  return source.slice(0, start) + replacement + source.slice(end);
}

let interpret = readFileSync('api/interpret.js', 'utf8');

const auditStart = "    const auditPrompt = `Audit this enrichment against the sealed Interpretation Artifact.";
const auditEnd = "    const packets = createEnrichmentPackets(artifact, enrichment);";
const auditedFallbackBlock = [
  "    // A substantive generated Framework is already valid Prism Analysis. The",
  "    // secondary audit is quality assurance, not an availability gate. If the",
  "    // auditor times out, truncates, emits invalid JSON, or otherwise fails, keep",
  "    // the validated generated analysis instead of discarding the entire Framework.",
  "    let enrichment = generatedEnrichment;",
  "    const auditPrompt = `Audit this enrichment against the sealed Interpretation Artifact.",
  "Remove or localize any contradiction, unsupported expansion, invented source, or claim exceeding the artifact. Preserve sound analysis and the exact JSON shape. Return JSON only. Do not revise the artifact.",
  "",
  "Artifact:\\n${serializeArtifactForEnrichment(artifact)}\\n\\nEnrichment:\\n${JSON.stringify(generatedEnrichment)}`;",
  "    timing('progressive_analysis_audit_start');",
  "    try {",
  "      const auditedCandidate = await callInquiryModel({",
  "        model: 'claude-haiku-4-5-20251001',",
  "        maxTokens: 3600,",
  "        timeoutMs: 20000,",
  "        prompt: auditPrompt,",
  "        structuredOutputSchema: PRISM_ENRICHMENT_SCHEMA,",
  "        structuredOutputName: 'emit_audited_enrichment',",
  "      });",
  "      const validatedAudit = validateEnrichment(auditedCandidate);",
  "      if (!hasSubstantiveEnrichment(validatedAudit)) throw new Error('ENRICHMENT_AUDIT_EMPTY');",
  "      enrichment = validatedAudit;",
  "      timing('progressive_analysis_audit_complete', { degraded: false });",
  "    } catch (auditError) {",
  "      timing('progressive_analysis_audit_degraded', {",
  "        error: String(auditError?.message || auditError).slice(0, 180),",
  "        fallback: 'validated_generated_enrichment',",
  "      });",
  "    }",
  "    const packets = createEnrichmentPackets(artifact, enrichment);",
].join('\n');

interpret = replaceBetween(
  interpret,
  auditStart,
  auditEnd,
  auditedFallbackBlock,
  "fallback: 'validated_generated_enrichment'",
);

writeFileSync('api/interpret.js', interpret);

let qt = readFileSync('qt.html', 'utf8');

qt = replaceExact(
  qt,
  "  const hasFramework = sections.some(function(s) { return s.content; }) || (d.key_terms && d.key_terms.length > 0) || d._analysisPending;",
  "  const hasFramework = sections.some(function(s) { return s.content; }) || (d.key_terms && d.key_terms.length > 0) || d._analysisPending || d._analysisIncomplete;",
  'd._analysisPending || d._analysisIncomplete',
);

qt = replaceExact(
  qt,
  String.raw`    if (d._analysisPending) {
      frameworkHtml += '<div class="early-recognition-progress">Prism Analysis continuing… Completed packets will appear here.</div>';
    }`,
  String.raw`    if (d._analysisPending) {
      frameworkHtml += '<div class="early-recognition-progress">Prism Analysis continuing… Completed packets will appear here.</div>';
    } else if (d._analysisIncomplete) {
      frameworkHtml += '<div id="prismAnalysisIncomplete" class="early-recognition-progress" data-artifact-id="' +
        escHtml(d._artifactId || '') + '" data-artifact-revision="' + escHtml(String(d._artifactRevision || '')) + '">' +
        'Prism Analysis paused. <button type="button" class="query-secondary-btn" onclick="retryProgressiveAnalysis(this)">Retry Analysis</button></div>';
    }`,
  'Prism Analysis paused.',
);

qt = replaceExact(
  qt,
  String.raw`  if (d._analysisIncomplete) {
    html += '<div id="prismAnalysisIncomplete" class="qt-framework-callout" data-artifact-id="' +`,
  String.raw`  if (d._analysisIncomplete && !hasFramework) {
    html += '<div id="prismAnalysisIncomplete" class="qt-framework-callout" data-artifact-id="' +`,
  'd._analysisIncomplete && !hasFramework',
);

writeFileSync('qt.html', qt);

const requiredInterpret = [
  'A substantive generated Framework is already valid Prism Analysis',
  "maxTokens: 3600",
  "timeoutMs: 20000",
  "structuredOutputName: 'emit_audited_enrichment'",
  "fallback: 'validated_generated_enrichment'",
  "timing('progressive_analysis_audit_degraded'",
  'const packets = createEnrichmentPackets(artifact, enrichment);',
];
for (const marker of requiredInterpret) {
  if (!interpret.includes(marker)) throw new Error(`Missing progressive Framework server marker: ${marker}`);
}

const requiredQt = [
  'd._analysisPending || d._analysisIncomplete',
  'Prism Analysis paused.',
  'd._analysisIncomplete && !hasFramework',
];
for (const marker of requiredQt) {
  if (!qt.includes(marker)) throw new Error(`Missing progressive Framework client marker: ${marker}`);
}

console.log('Progressive Framework resilience repair applied and source assertions passed.');
