import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function runNode(file) {
  const result = spawnSync(process.execPath, [file], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${file} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

const repairScripts = [
  'scripts/runtime-archive-repair.mjs',
  'scripts/followup-lineage-repair.mjs',
  'scripts/print-layout-repair.mjs',
  'scripts/progressive-framework-repair.mjs',
  'scripts/semantic-paragraphing.mjs',
];

for (const script of repairScripts) runNode(script);

const tests = readdirSync('tests')
  .filter((name) => name.endsWith('.mjs'))
  .sort()
  .map((name) => `tests/${name}`);

for (const test of tests) runNode(test);

console.log(`Build validation complete: ${tests.length} tests passed.`);
