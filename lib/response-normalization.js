function comparableParagraph(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en-US');
}

export function collapseRepeatedTerminalParagraphs(value) {
  const paragraphs = String(value || '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n[ \t]*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  while (
    paragraphs.length > 1
    && comparableParagraph(paragraphs.at(-1)) === comparableParagraph(paragraphs.at(-2))
  ) {
    paragraphs.pop();
  }

  return paragraphs.join('\n\n');
}
