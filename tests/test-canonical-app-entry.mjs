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
    destination: '/qt-gateway.html',
    permanent: false,
  },
  'The bare production domain must offer account sign-in and guest access',
);

console.log('Canonical app entry routing checks passed.');
