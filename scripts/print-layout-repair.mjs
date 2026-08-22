import { readFileSync, writeFileSync } from 'node:fs';

const path = 'qt.html';
let source = readFileSync(path, 'utf8');

function replaceOnce(before, after, marker) {
  const count = source.split(before).length - 1;
  if (count === 1) {
    source = source.replace(before, after);
    return;
  }
  if (source.includes(marker)) return;
  throw new Error(`Print layout repair failed for ${marker}: expected one source match, found ${count}`);
}

replaceOnce(
  'onclick="window.print()" title="Print this conversation"',
  'onclick="requestAnimationFrame(() => setTimeout(() => window.print(), 0))" title="Print this conversation"',
  'requestAnimationFrame(() => setTimeout(() => window.print(), 0))',
);

replaceOnce(
  `    @page {\n      margin: 18mm 18mm 22mm 18mm;\n      size: A4 portrait;\n    }`,
  `    @page {\n      /* Reserve a generous physical-page safe zone for browser/printer\n         headers and footers, and honor the user's selected paper size. */\n      margin: 1in 0.75in 1in 0.75in;\n      size: auto;\n    }`,
  'margin: 1in 0.75in 1in 0.75in;',
);

writeFileSync(path, source);
console.log('Print layout repair applied: safe page margins and non-blocking print dispatch.');
