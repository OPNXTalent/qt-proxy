import { readFileSync, writeFileSync } from 'node:fs';

function replaceExact(source, before, after, marker) {
  const count = source.split(before).length - 1;
  if (count === 1) return source.replace(before, after);
  if (source.includes(marker)) return source;
  throw new Error(`${marker}: expected one source match, found ${count}`);
}

// Preserve semantic paragraph guidance on the reconstructed initial-response
// contract without restoring the retired structured Framework artifact.
let progressive = readFileSync('lib/prompt-modules/progressive-inquiry.js', 'utf8');
progressive = replaceExact(
  progressive,
  `Respond to the inquiry in polished plain prose as The Prism. Preserve the governing epistemic discipline and answer the user's actual question directly. Distinguish what the evidence establishes from inference and uncertainty. Do not expose internal analysis, JSON, schemas, cards, or framework labels. Do not append a routine engagement question, summary, or invitation. End where the inquiry naturally reaches its proper terminus.`,
  `Respond to the inquiry in polished plain prose as The Prism. Preserve the governing epistemic discipline and answer the user's actual question directly. Distinguish what the evidence establishes from inference and uncertainty. Use semantic paragraphing whenever the response develops more than one material thought: begin a new paragraph when the reasoning moves between premise, evidence, qualification, complication, implication, or conclusion. Most paragraphs should be roughly 2–5 sentences. Do not manufacture arbitrary one-sentence fragments or excessive headings, and never collapse a long response into one contiguous block. Separate natural paragraphs with a blank line so the renderer preserves the intended breathing room. Do not expose internal analysis, JSON, schemas, cards, or framework labels. Do not append a routine engagement question, summary, or invitation. End where the inquiry naturally reaches its proper terminus.`,
  'Use semantic paragraphing whenever the response develops more than one material thought',
);
writeFileSync('lib/prompt-modules/progressive-inquiry.js', progressive);

let runtime = readFileSync('lib/persistent-inquiry-runtime.js', 'utf8');

runtime = replaceExact(
  runtime,
  `- Plain prose. No JSON, headings, audit narration, or framework-stage narration.`,
  `- Plain prose. No JSON, headings, audit narration, or framework-stage narration.\n- Use semantic paragraphing whenever the response carries more than one material thought. As a default, keep paragraphs to roughly 2–5 sentences and begin a new paragraph when the reasoning shifts between premise, evidence, qualification, complication, implication, or conclusion. Do not create arbitrary one-sentence fragments or excessive headings, and do not collapse a long response into one contiguous block.`,
  'Use semantic paragraphing whenever the response carries more than one material thought',
);

runtime = replaceExact(
  runtime,
  `Preserve the draft's meaning, voice, and useful distinctions. Do not add a new argument, pastoral language, headings, or audit commentary. Return only the final response text.`,
  `Preserve the draft's meaning, voice, and useful distinctions. Preserve meaningful paragraph breaks. If a longer draft arrives as one contiguous block, introduce semantic paragraph breaks at genuine shifts in thought without changing the argument or adding content. Do not add a new argument, pastoral language, headings, or audit commentary. Return only the final response text.`,
  'Preserve meaningful paragraph breaks',
);

writeFileSync('lib/persistent-inquiry-runtime.js', runtime);

let qt = readFileSync('qt.html', 'utf8');

// The reconstructed renderer already centralizes escaping/emphasis through
// formatPrismProse(). Split only on semantic blank-line boundaries. For the
// common one-paragraph case preserve the direct formatter path as well.
if (!qt.includes('var coreParagraphs = String(d.core_insight).split')) {
  const oldModern = `  if (d.core_insight) {\n    html += '<div class="qt-core-insight"><p>' + formatPrismProse(d.core_insight) + '</p></div>';\n  }`;
  const oldLegacy = `  if (d.core_insight) {\n    html += '<div class="qt-core-insight"><p>' + escHtml(d.core_insight) + '</p></div>';\n  }`;
  const modernReplacement = `  if (d.core_insight) {\n    var coreParagraphs = String(d.core_insight).split(/\\n\\s*\\n/).map(function(p) { return p.trim(); }).filter(Boolean);\n    if (coreParagraphs.length <= 1) {\n      html += '<div class="qt-core-insight"><p>' + formatPrismProse(d.core_insight) + '</p></div>';\n    } else {\n      html += '<div class="qt-core-insight">' + coreParagraphs.map(function(p) {\n        return '<p>' + formatPrismProse(p.replace(/\\n/g, ' ')) + '</p>';\n      }).join('') + '</div>';\n    }\n  }`;
  const legacyReplacement = modernReplacement
    .replaceAll('formatPrismProse', 'escHtml');
  if (qt.includes(oldModern)) {
    qt = qt.replace(oldModern, modernReplacement);
  } else if (qt.includes(oldLegacy)) {
    qt = qt.replace(oldLegacy, legacyReplacement);
  } else {
    throw new Error('semantic paragraphing: reconstructed core response renderer not found');
  }
}

qt = replaceExact(
  qt,
  `  .qt-core-insight p {\n    font-family: var(--crimson);\n    font-size:21px;\n    color: var(--text);\n    line-height: 1.8;\n    margin: 0;`,
  `  .qt-core-insight p {\n    font-family: var(--crimson);\n    font-size:21px;\n    color: var(--text);\n    line-height: 1.8;\n    margin: 0;\n  }\n  .qt-core-insight p + p {\n    margin-top: 1.05em;`,
  '.qt-core-insight p + p',
);

writeFileSync('qt.html', qt);

const requiredProgressive = [
  'Use semantic paragraphing whenever the response develops more than one material thought',
  'Most paragraphs should be roughly 2–5 sentences',
  'never collapse a long response into one contiguous block',
];
for (const marker of requiredProgressive) {
  if (!progressive.toLowerCase().includes(marker.toLowerCase())) {
    throw new Error(`Missing semantic paragraphing initial-response marker: ${marker}`);
  }
}

const requiredRuntime = [
  'Use semantic paragraphing whenever the response carries more than one material thought',
  'roughly 2–5 sentences',
  'Preserve meaningful paragraph breaks',
  'introduce semantic paragraph breaks at genuine shifts in thought',
];
for (const marker of requiredRuntime) {
  if (!runtime.includes(marker)) throw new Error(`Missing semantic paragraphing runtime marker: ${marker}`);
}

const requiredQt = [
  'var coreParagraphs = String(d.core_insight).split',
  '.qt-core-insight p + p',
  'margin-top: 1.05em;',
];
for (const marker of requiredQt) {
  if (!qt.includes(marker)) throw new Error(`Missing semantic paragraphing presentation marker: ${marker}`);
}
if (!qt.includes("formatPrismProse(p.replace(/\\n/g, ' '))") && !qt.includes("escHtml(p.replace(/\\n/g, ' '))")) {
  throw new Error('Missing semantic paragraph formatter');
}

console.log('Semantic paragraphing applied to reconstructed initial, follow-up, and presentation contracts.');
