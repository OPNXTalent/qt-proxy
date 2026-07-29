import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const vercel = JSON.parse(
  readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'),
);

const rootRedirect = vercel.redirects?.find((route) => route.source === '/');

assert.deepEqual(
  rootRedirect,
  {
    source: '/',
    destination: '/qt.html?mode=anon',
    permanent: false,
  },
  'The bare production domain must open the anonymous Prism interpreter',
);

console.log('Canonical app entry routing checks passed.');
