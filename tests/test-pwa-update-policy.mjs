import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serviceWorker = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const interpreter = readFileSync(new URL('../qt.html', import.meta.url), 'utf8');
const manifest = JSON.parse(
  readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'),
);

assert.equal(
  manifest.start_url,
  '/qt.html?source=pwa',
  'The installed PWA must launch the shared interpreter',
);
assert.match(
  serviceWorker,
  /const CACHE_NAME = 'prism-shell-v14'/,
  'A new cache version must retire stale earlier responses',
);
assert.deepEqual(
  manifest.display_override,
  ['standalone', 'minimal-ui'],
  'Installed launches should prefer a focused app window',
);
assert.match(
  serviceWorker,
  /event\.request\.mode === 'navigate'[\s\S]*event\.request\.destination === 'document'[\s\S]*url\.pathname\.endsWith\('\.html'\)/,
  'Navigations and HTML documents must use the update-safe path',
);
assert.match(
  serviceWorker,
  /if \(isNavigation \|\| isCodeAsset\) \{[\s\S]*fetch\(event\.request\)[\s\S]*\.catch\(\(\) => caches\.match\(event\.request\)\)/,
  'Documents and executable assets must be network-first with cached fallback',
);
assert.match(
  serviceWorker,
  /const isSharedNavigation = isNavigation && url\.searchParams\.has\('t'\);[\s\S]*if \(isSharedNavigation\) \{[\s\S]*fetch\(event\.request, \{ cache: 'no-store' \}\)[\s\S]*return;/,
  'Tokenized shared-query documents must always come from the network without a stale fallback',
);
const sharedNavigationPolicy = serviceWorker.slice(
  serviceWorker.indexOf('if (isSharedNavigation)'),
  serviceWorker.indexOf('// The interpreter and its executable assets'),
);
assert.doesNotMatch(
  sharedNavigationPolicy,
  /caches\.(?:match|open)|cache\.put/,
  'Shared-query HTML must never be read from or written to the PWA cache',
);
assert.match(
  serviceWorker,
  /url\.pathname\.startsWith\('\/api\/'\)[\s\S]*return;/,
  'API calls must continue to bypass the service worker cache',
);
assert.doesNotMatch(
  serviceWorker.match(/const APP_SHELL = \[[\s\S]*?\];/)?.[0] || '',
  /qt\.html/,
  'qt.html must not be blanket-precached',
);
assert.match(
  interpreter,
  /serviceWorker\.register\('\/sw\.js', \{ updateViaCache: 'none' \}\)/,
  'PWA launches must bypass the HTTP cache when checking the worker script',
);
assert.match(
  interpreter,
  /registration\.update\(\)/,
  'PWA launches must explicitly check for a newer worker',
);
assert.match(
  interpreter,
  /serviceWorker\.addEventListener\('controllerchange'[\s\S]*window\.location\.reload\(\)/,
  'An existing installation must reload once when an updated worker takes control',
);

console.log('PWA update policy checks passed.');
