import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !/KEY|TOKEN|SECRET|PASSWORD|^SUPABASE_|^PRISM_PREVIEW_|^PREVIEW_TEST_|^VERCEL_ENV$/.test(key)));
env.VERCEL_ENV = 'test';
let failures = 0;
for (const file of readdirSync(new URL('../tests/', import.meta.url)).filter(f => f.endsWith('.mjs')).sort()) {
  const result = spawnSync(process.execPath, ['--import', './tests/helpers/offline-network.mjs', `./tests/${file}`], {
    cwd: root, env, stdio: 'inherit', timeout: 120000,
  });
  if (result.error || result.status !== 0) {
    failures++;
    console.error(`FAILED: ${file}${result.error ? ` (${result.error.code})` : ''}`);
  }
}
console.log(`Offline test scripts: ${failures} failed`);
process.exitCode = failures ? 1 : 0;
