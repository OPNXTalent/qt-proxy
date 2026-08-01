import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../docs/migrations/2026-07-31-thread-owner-identity.sql', import.meta.url),
  'utf8',
);

assert.match(migration, /left join auth\.users as auth_user on auth_user\.id = thread\.user_id/);
assert.match(migration, /raise exception 'THREAD_OWNER_AUTH_USER_MISSING'/);
assert.match(migration, /drop constraint if exists threads_user_id_fkey/);
assert.match(migration, /references auth\.users\(id\)/);
assert.doesNotMatch(migration, /references public\.subscribers/);

console.log('thread owner identity migration checks passed');
