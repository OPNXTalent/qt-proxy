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
  `  .query-secondary-btn:hover { color: rgba(160,155,140,0.6); }`,
  `  .query-secondary-btn:hover { color: rgba(160,155,140,0.6); }\n\n  /* Print is the persistent artifact action opposite Share This. Keep it\n     visually quiet, but give it the same readable scale as Share This and\n     the same gold-pale foreground used by the Ask / Interpret action. */\n  #queryPrintBtn {\n    font-size:12px;\n    letter-spacing: 0.18em;\n    color: var(--gold-pale);\n  }\n  #queryPrintBtn:hover { color: var(--gold); }`,
  '#queryPrintBtn {\n    font-size:12px;',
);

replaceOnce(
  `    @page {\n      margin: 18mm 18mm 22mm 18mm;\n      size: A4 portrait;\n    }`,
  `    /* The physical @page margin remains the first line of defense, but\n       some browser/printer combinations render it more tightly than the\n       preview suggests. Clone a small internal top/bottom gutter on every\n       fragmented page as well so prose never appears to run into the edge. */\n    .shell {\n      padding-top: 0.28in !important;\n      padding-bottom: 0.32in !important;\n      -webkit-box-decoration-break: clone;\n      box-decoration-break: clone;\n    }\n\n    @page {\n      margin: 0.65in 0.75in 0.70in 0.75in;\n      size: auto;\n    }`,
  'box-decoration-break: clone;',
);

// Final normalization: the print action must never regress to a synchronous
// inline window.print() call, even if another presentation repair rewrites the
// surrounding button markup before this script runs.
source = source.replaceAll(
  'onclick="window.print()"',
  'onclick="requestAnimationFrame(() => setTimeout(() => window.print(), 0))"',
);

if (source.includes('onclick="window.print()"')) {
  throw new Error('Print layout repair left a blocking inline print handler');
}

writeFileSync(path, source);
console.log('Print layout repair applied: repeated page gutters, readable Print action, and non-blocking print dispatch.');
