import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const frontend = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const mobileStart = frontend.indexOf('@media (max-width: 600px)');
const compactStart = frontend.indexOf('@media (max-width: 380px)', mobileStart);
assert.ok(mobileStart >= 0 && compactStart > mobileStart, 'A dedicated phone layout must exist');
const mobile = frontend.slice(mobileStart, compactStart);

assert.match(
  mobile,
  /\.shell\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*none;[\s\S]*?env\(safe-area-inset-right\)[\s\S]*?env\(safe-area-inset-left\)/,
  'The phone shell must fill the viewport while respecting display cutouts',
);
assert.match(
  mobile,
  /\.node-controls\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/,
  'Print, Share, and Notes must remain equal-width columns on phones',
);
assert.match(
  mobile,
  /\.node-ctrl-btn\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?min-height:\s*44px;/,
  'Response actions must shrink safely and retain touch-sized targets',
);
assert.match(
  mobile,
  /\.follow-up-submit-row\s*\{[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/,
  'New Subject and Enter must remain paired without horizontal clipping',
);
assert.match(
  mobile,
  /#discussionPanel\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100dvh;[\s\S]*?env\(safe-area-inset-top\)/,
  'Notes and Share must open as a safe-area-aware full-screen phone surface',
);
assert.match(
  mobile,
  /\.site-footer\s*\{[\s\S]*?align-items:\s*flex-start;[\s\S]*?text-align:\s*left;/,
  'The phone footer must retain the approved left-aligned treatment',
);

console.log('Responsive PWA layout checks passed.');
