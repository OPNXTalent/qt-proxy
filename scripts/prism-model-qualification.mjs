import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureQualificationPrompt } from '../api/interpret.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = value => createHash('sha256').update(value).digest('hex');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));

export function qualifyReviews(reviews, expectedIds) {
  if (!Array.isArray(reviews) || new Set(reviews.map(r => r.caseId)).size !== reviews.length)
    throw new Error('DUPLICATE_OR_INVALID_REVIEWS');
  const dimensions = ['fidelity', 'reasoning', 'voice', 'constraints', 'factualIntegrity'];
  let acceptable = 0, critical = 0;
  for (const r of reviews) {
    if (!expectedIds.includes(r.caseId)) throw new Error('UNKNOWN_CASE');
    if (!Array.isArray(r.criticalFailures) || !r.reviewer || !r.rationale)
      throw new Error('REVIEW_EVIDENCE_REQUIRED');
    if (dimensions.some(d => !Number.isInteger(r[d]) || r[d] < 1 || r[d] > 5))
      throw new Error('SCORES_MUST_BE_1_TO_5');
    critical += r.criticalFailures.length;
    if (!r.criticalFailures.length && dimensions.every(d => r[d] >= 4)) acceptable++;
  }
  const complete = reviews.length === expectedIds.length;
  const passRate = acceptable / expectedIds.length;
  return { complete, criticalFailures: critical, acceptable, total: expectedIds.length,
    passRate, offlineQualityGate: complete && critical === 0 && passRate >= 0.95,
    productionPromotion: false };
}

async function main() {
  const [command, file, destination] = process.argv.slice(2);
  if (command === 'prepare') {
    if (!file) throw new Error('Usage: prepare OUTPUT_DIRECTORY [FROZEN_CONTEXT_JSON]');
    const output = resolve(file);
    const contexts = destination ? await readJson(resolve(destination)) : {};
    const corpus = await readJson(resolve(root, 'evals/model-qualification/corpus.json'));
    const registry = await readJson(resolve(root, 'evals/model-qualification/registry.json'));
    const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const sourceDiff = execFileSync('git', ['diff', 'HEAD', '--', 'api/interpret.js', 'lib'], { cwd: root, encoding: 'utf8' });
    const snapshots = corpus.map(c => {
      const prompt = captureQualificationPrompt({ query: c.query, ...(contexts[c.id] || {}) });
      return { caseId: c.id, ...prompt, promptHash: hash(JSON.stringify({ system: prompt.system, input: prompt.input })) };
    });
    const manifest = { runId: randomUUID(), createdAt: new Date().toISOString(), sourceCommit,
      sourceDiffHash: hash(sourceDiff), corpusHash: hash(JSON.stringify(corpus)), registry,
      qualificationEligible: corpus.every(c => c.approval === 'approved') && snapshots.every(p => p.retrievalStatus !== 'no-retrieval-smoke-only'),
      limitations: ['Primary canonical generation only; follow-up reducer, draft and audit paths require separate suites.',
        'No API calls made. No model evaluated. Prompt-only preparation cannot certify UI Scripture ordering, streaming, billing or persistence.'],
      snapshots };
    await mkdir(output, { recursive: true });
    // Exclusive write prevents accidentally replacing a frozen run.
    await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ prepared: snapshots.length, qualificationEligible: manifest.qualificationEligible, output }));
  } else if (command === 'blind') {
    if (!file || !destination) throw new Error('Usage: blind OUTPUTS_JSON OUTPUT_DIRECTORY');
    const rows = await readJson(resolve(file));
    if (!Array.isArray(rows) || !rows.length) throw new Error('OUTPUTS_REQUIRED');
    const identities = new Set();
    for (const r of rows) {
      if (!r.caseId || !r.model || !r.promptHash || !r.sourceCommit || !r.response || !r.runId)
        throw new Error('OUTPUT_PROVENANCE_REQUIRED');
      const key = `${r.runId}:${r.caseId}:${r.model}`;
      if (identities.has(key)) throw new Error('DUPLICATE_OUTPUT');
      identities.add(key);
    }
    const shuffled = rows.map(r => ({ row: r, sort: randomUUID() })).sort((a,b) => a.sort.localeCompare(b.sort));
    const key = [], review = [];
    for (const { row } of shuffled) {
      const outputId = randomUUID();
      key.push({ outputId, ...row });
      review.push({ outputId, caseId: row.caseId, response: row.response,
        fidelity: null, reasoning: null, voice: null, constraints: null, factualIntegrity: null,
        criticalFailures: [], reviewer: '', rationale: '' });
    }
    const output = resolve(destination); await mkdir(output, { recursive: true });
    await writeFile(resolve(output, 'identity-key.private.json'), JSON.stringify(key, null, 2), { flag: 'wx', mode: 0o600 });
    await writeFile(resolve(output, 'blind-review.json'), JSON.stringify(review, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ blinded: review.length, output }));
  } else if (command === 'score') {
    if (!file) throw new Error('Usage: score REVIEWS_FOR_ONE_MODEL_JSON');
    const corpus = await readJson(resolve(root, 'evals/model-qualification/corpus.json'));
    console.log(JSON.stringify(qualifyReviews(await readJson(resolve(file)), corpus.map(c => c.id)), null, 2));
  } else throw new Error('Commands: prepare, blind, score');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
