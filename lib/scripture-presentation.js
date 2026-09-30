// Lift the model-selected quotation into the existing durable verse fields.
// No second generation, client lookup, or change to the selected wording.
export function extractScripturePresentation(response) {
  const text = String(response || '').trim();
  const paragraphs = text.split(/\n\s*\n/);
  const reference = /^(?:[1-3]\s+)?[A-Za-z]+(?:\s+[A-Za-z]+){0,3}\s+\d+:\d+(?:[–-]\d+(?::\d+)?)?(?:\s*\((?:ESV|NRSV|NRSVue|KJV|NKJV|NIV|WEB)\))?$/;
  for (let i = 0; i < paragraphs.length; i++) {
    const lines = paragraphs[i].trim().split('\n');
    const ref = lines.shift().trim();
    const quote = lines.join('\n').trim();
    if (!reference.test(ref) || !/^[“"][\s\S]+[”"]$/.test(quote)) continue;
    const verseText = quote.slice(1, -1).trim();
    const canonicalResponse = paragraphs.filter((_, index) => index !== i).join('\n\n').trim();
    if (!verseText || !canonicalResponse || verseText.length > 4000) continue;
    return { canonicalResponse, verseIdentified: ref, verseText };
  }
  return { canonicalResponse: text, verseIdentified: '', verseText: '' };
}
