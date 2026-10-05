import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openAIAdapter, responsesRequest, reserveCost, costFromUsage, SpendLedger } from './prism-execution-adapters.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const digest = value => createHash('sha256').update(value).digest('hex');
export const PILOT_IDS = ['PQ-002', 'PQ-008', 'PQ-021', 'PQ-031', 'PQ-048'];

async function main() {
  const [manifestPath, keyFile, destination] = process.argv.slice(2);
  if (!manifestPath || !keyFile || !destination) throw new Error('Usage: MANIFEST EVALUATION_ENV_FILE PRIVATE_OUTPUT_DIRECTORY');
  const manifest = await json(resolve(manifestPath));
  const corpus = await json(resolve(root, 'evals/model-qualification/corpus.json'));
  const pricing = await json(resolve(root, 'evals/model-qualification/pilot-pricing.json'));
  const snapshots = PILOT_IDS.map(id => manifest.snapshots.find(s => s.caseId === id));
  for (const s of snapshots) {
    if (!s || digest(JSON.stringify({system:s.system, input:s.input})) !== s.promptHash)
      throw new Error('PROMPT_PROVENANCE_MISMATCH');
  }
  const key = (await readFile(resolve(keyFile), 'utf8')).match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  const adapter = openAIAdapter(key);
  const output = resolve(destination); await mkdir(output, {recursive:true});
  // A run can never be replayed implicitly after a timeout or restart.
  await writeFile(resolve(output, 'run.lock'), manifest.runId, {flag:'wx',mode:0o600});
  const persist = (name, data) => writeFile(resolve(output,name), JSON.stringify(data,null,2), {mode:0o600});
  const ledger = new SpendLedger(2);
  const summary = { runId:manifest.runId, sourceCommit:manifest.sourceCommit,
    qualificationEligible:false, productionPromotion:false, budgetUsd:2,
    pilotIds:PILOT_IDS, pricing, unavailable:[], preflightFailures:[], rows:[],
    limitations:['Unreviewed corpus and no frozen retrieval: smoke pilot only.',
      'No Sonnet comparator, follow-up suite or end-to-end validation.',
      'Rate-derived cost is not invoice-reconciled. Unknown charges retain full reservations.'] };
  await persist('pilot-summary.json',summary);
  const listing = await adapter.listModels();
  if (!listing.ok) throw new Error(`MODEL_LIST_${listing.error}`);
  const listed = new Set(listing.data.data.map(m=>m.id));
  const plan = [];
  for (const candidate of manifest.registry.candidates) {
    const model = candidate.model;
    if (!listed.has(model)) { summary.unavailable.push({model,reason:'not-listed-for-evaluation-key'}); continue; }
    const rate = pricing.rates[model]; if (!rate) throw new Error('VERIFIED_PRICE_REQUIRED');
    for (const snapshot of snapshots) {
      const body = responsesRequest(snapshot,model);
      const count = await adapter.count(body);
      if (!count.ok) {
        const failure = {model,caseId:snapshot.caseId,error:count.error,httpStatus:count.httpStatus};
        if (['model_not_found','permission_denied'].includes(count.error)) summary.unavailable.push(failure);
        else summary.preflightFailures.push(failure);
        break;
      }
      const inputTokens = count.data.input_tokens;
      if (!Number.isInteger(inputTokens) || inputTokens < 0 || inputTokens > 272000) throw new Error('UNSUPPORTED_INPUT_COUNT');
      plan.push({model,snapshot,inputTokens,rate});
    }
  }
  // Require all five questions to be countable for a candidate. No partial
  // candidate comparisons and no automatic substitution of model identities.
  const runnable = plan.filter(p=>plan.filter(x=>x.model===p.model).length===5);
  const inputReserve = runnable.reduce((n,p)=>n+reserveCost(p.inputTokens,1,p.rate)-p.rate.output/1e6,0);
  const outputRate = runnable.reduce((n,p)=>n+p.rate.output/1e6,0);
  const maxOutputTokens = outputRate ? Math.min(4000, Math.floor((1.90-inputReserve)/outputRate)) : 2400;
  if (runnable.length && maxOutputTokens < 1800) throw new Error('FIVE_QUESTION_PILOT_EXCEEDS_BUDGET');
  summary.configuration = {endpoint:'https://api.openai.com/v1/responses',reasoning:'low',serviceTier:'default',
    maxOutputTokens,timeoutMs:90000,store:false,tools:[],retries:0,caching:'provider-automatic; no hit assumed for budget'};
  summary.worstCasePlannedCostUsd = runnable.reduce((n,p)=>n+reserveCost(p.inputTokens,maxOutputTokens,p.rate),0);
  summary.cases = corpus.filter(c=>PILOT_IDS.includes(c.id));
  await persist('pilot-summary.json',summary);
  console.log(JSON.stringify({phase:'preflight',requests:runnable.length,maxOutputTokens,worstCaseUsd:summary.worstCasePlannedCostUsd,unavailable:summary.unavailable}));
  for (const p of runnable) {
    const reserved = reserveCost(p.inputTokens,maxOutputTokens,p.rate);
    ledger.reserve(reserved);
    summary.committedOrReservedUsd=ledger.committed;
    await persist('pilot-summary.json',summary); // durable reservation before dispatch
    const body = responsesRequest(p.snapshot,p.model,maxOutputTokens);
    const result = await adapter.execute(body);
    if (!result.ok && ['model_not_found','permission_denied'].includes(result.error))
      summary.unavailable.push({model:p.model,caseId:p.snapshot.caseId,error:result.error,httpStatus:result.httpStatus});
    const row = {runId:manifest.runId,caseId:p.snapshot.caseId,model:p.model,
      promptHash:p.snapshot.promptHash,sourceCommit:manifest.sourceCommit,
      requestConfiguration:body, inputTokenPreflight:p.inputTokens,reservedCostUsd:reserved,...result};
    // Full frozen request is private and never committed.
    if (result.ok && result.usage) {
      const cost = costFromUsage(result.usage,p.rate);
      row.costUsd=cost;
      if (result.serviceTier !== 'default' || result.resolvedModel !== p.model && !result.resolvedModel?.startsWith(p.model+'-'))
        row.accountingWarning='PROVIDER_CONFIGURATION_DIFFERED';
      if (!row.accountingWarning) ledger.settle(reserved,cost);
    }
    summary.rows.push(row);
    summary.usageCostUsd=ledger.usageCost; summary.committedOrReservedUsd=ledger.committed;
    await appendFile(resolve(output,'outputs.jsonl'),JSON.stringify(row)+'\n',{mode:0o600});
    await persist('pilot-summary.json',summary);
    console.log(JSON.stringify({model:p.model,caseId:p.snapshot.caseId,status:result.status||result.error,costUsd:row.costUsd,latencyMs:result.latencyMs,committedUsd:ledger.committed}));
    if (!result.ok || row.accountingWarning || !result.usage) { summary.stopped='PROVIDER_FAILURE_OR_UNCERTAIN_ACCOUNTING'; break; }
  }
  await persist('outputs.json',summary.rows);
  await persist('pilot-summary.json',summary);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error=>{
    const safe = /^(SPENDING_CAP|COST_BOUND_EXCEEDED|PROMPT_PROVENANCE_MISMATCH|UNSUPPORTED_INPUT_COUNT|VERIFIED_PRICE_REQUIRED|FIVE_QUESTION_PILOT_EXCEEDS_BUDGET|USAGE_REQUIRED|INVALID_USAGE|MODEL_LIST_[A-Z0-9_]+)$/i.test(error.message) ? error.message : 'LOCAL_OR_PROVIDER_FAILURE';
    console.error(`PILOT_STOPPED_SAFELY: ${safe}. Inspect private run metadata; no automatic retry.`);
    process.exitCode=1;
  });
}
