import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../docs/migrations/2026-07-31-thread-owner-identity.sql', import.meta.url),
  'utf8',
);

assert.match(migration, /select count\(\*\)[\s\S]*public\.subscribers as subscriber[\s\S]*join auth\.users as mapped_auth_user/);
assert.match(migration, /lower\(mapped_auth_user\.email\) = lower\(subscriber\.email\)/);
assert.match(migration, /raise exception 'THREAD_OWNER_AUTH_MAPPING_NOT_UNIQUE'/);
assert.match(migration, /update public\.threads as thread[\s\S]*set user_id = mapped_auth_user\.id/);
assert.match(migration, /raise exception 'THREAD_OWNER_AUTH_MIGRATION_INCOMPLETE'/);
assert.match(migration, /drop constraint if exists threads_user_id_fkey/);
assert.match(migration, /references auth\.users\(id\)/);
assert.doesNotMatch(migration, /references public\.subscribers/);

const dropIndex = migration.indexOf('drop constraint if exists threads_user_id_fkey');
const updateIndex = migration.indexOf('update public.threads as thread');
const addIndex = migration.indexOf('add constraint threads_user_id_fkey');
assert.ok(dropIndex < updateIndex, 'legacy foreign key must be dropped before owner IDs change');
assert.ok(updateIndex < addIndex, 'auth foreign key must be added after owner IDs change');

console.log('thread owner identity migration checks passed');
