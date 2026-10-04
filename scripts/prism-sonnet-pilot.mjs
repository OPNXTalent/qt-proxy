import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash,randomUUID } from 'node:crypto';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { anthropicAdapter,anthropicRequest,SONNET_RATE,reserveCost,costFromUsage,SpendLedger } from './prism-execution-adapters.mjs';
import { PILOT_IDS } from './prism-model-pilot.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');

async function main(){
 const [manifestFile,previousResults,keyFile,destination]=process.argv.slice(2);
 if(!destination)throw new Error('ARGUMENTS_REQUIRED');
 const manifest=await read(resolve(manifestFile)),previous=await read(resolve(previousResults));
 if(manifest.runId!==previous.runId||manifest.sourceCommit!==previous.sourceCommit)throw new Error('PROVENANCE_MISMATCH');
 const prior=previous.rows.reduce((n,r)=>n+r.costUsd,0);
 if(!Number.isFinite(prior)||Math.abs(prior-previous.costUsd)>1e-8||prior<0.916934)throw new Error('PRIOR_COST_INVALID');
 const key=(await readFile(resolve(keyFile),'utf8')).match(/^\s*ANTHROPIC_API_KEY\s*=\s*([^\r\n]+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g,'');
 const adapter=anthropicAdapter(key);
 const output=resolve(destination);await mkdir(output,{recursive:true});
 await writeFile(resolve(output,'run.lock'),randomUUID(),{flag:'wx',mode:0o600});
 const persist=(name,value)=>writeFile(resolve(output,name),JSON.stringify(value,null,2),{mode:0o600});
 const summary={runId:randomUUID(),frozenRunId:manifest.runId,sourceCommit:manifest.sourceCommit,
   priorCostUsd:prior,budgetUsd:2,remainingBudgetUsd:2-prior,rate:SONNET_RATE,
   pricingSource:'https://platform.claude.com/docs/en/models/sonnet-4-6/overview',
   qualificationEligible:false,productionPromotion:false,rows:[],preflight:[],
   configuration:{endpoint:'https://api.anthropic.com/v1/messages',anthropicVersion:'2023-06-01',
     thinking:'adaptive',effort:'low',maxOutputTokens:previous.configuration.maxOutputTokens,
     serviceTier:'standard_only',cacheTtl:'5m',timeoutMs:90000,tools:[],retries:0},
   apiDifferences:['System text is a top-level text block; input is one user message. Frozen strings unchanged.',
     'API authentication uses x-api-key and anthropic-version, not a bearer token.',
     'max_tokens replaces max_output_tokens; adaptive thinking and output_config.effort=low replace reasoning.effort=low. Effort is not equivalent across providers.',
     'standard_only replaces default tier; cache_control explicitly requests a 5-minute system cache.',
     'Messages has no Responses store=false parameter. No conversation storage or tools requested; provider retention policy still applies.',
     'Anthropic input_tokens excludes cache read/write tokens, so normalized input includes all three. Output includes thinking; normalize a separately reported thinking count when present, otherwise retain null.',
     'end_turn is complete; max_tokens and other stop reasons are marked incomplete.'],
   adapterHash:hash(await readFile(resolve(root,'scripts/prism-execution-adapters.mjs'),'utf8')),
   runnerHash:hash(await readFile(fileURLToPath(import.meta.url),'utf8'))};
 await persist('summary.json',summary);
 const plans=[];
 for(const id of PILOT_IDS){
   const snapshot=manifest.snapshots.find(s=>s.caseId===id);
   if(!snapshot||hash(JSON.stringify({system:snapshot.system,input:snapshot.input}))!==snapshot.promptHash)throw new Error('PROVENANCE_MISMATCH');
   const olds=previous.rows.filter(r=>r.caseId===id);
   if(olds.length!==5||olds.some(r=>r.promptHash!==snapshot.promptHash))throw new Error('PROVENANCE_MISMATCH');
   const body=anthropicRequest(snapshot,summary.configuration.maxOutputTokens);
   const count=await adapter.count(body);
   if(!count.ok){summary.blocker={phase:'token-count',caseId:id,error:count.error,httpStatus:count.httpStatus};await persist('summary.json',summary);console.log(JSON.stringify(summary.blocker));return;}
   const tokens=count.data.input_tokens;
   if(!Number.isInteger(tokens)||tokens<0||tokens>200000)throw new Error('UNSUPPORTED_INPUT_COUNT');
   const reserve=reserveCost(tokens,body.max_tokens,SONNET_RATE);
   plans.push({snapshot,body,reserve});summary.preflight.push({caseId:id,inputTokens:tokens,reservedCostUsd:reserve});
 }
 const worst=plans.reduce((n,p)=>n+p.reserve,0);
 summary.worstCaseSonnetCostUsd=worst;summary.worstCaseCumulativeCostUsd=prior+worst;
 await persist('summary.json',summary);
 console.log(JSON.stringify({phase:'preflight',priorCostUsd:prior,worstCaseSonnetCostUsd:worst,worstCaseCumulativeCostUsd:prior+worst,remainingBudgetUsd:2-prior}));
 if(prior+worst>=2){summary.blocker={phase:'budget',error:'INSUFFICIENT_REMAINING_BUDGET'};await persist('summary.json',summary);return;}
 const ledger=new SpendLedger(2);ledger.reserve(prior);
 for(const p of plans){
   ledger.reserve(p.reserve);summary.committedOrReservedUsd=ledger.committed;await persist('summary.json',summary);
   const result=await adapter.execute(p.body);
   const row={runId:summary.runId,frozenRunId:manifest.runId,caseId:p.snapshot.caseId,model:'claude-sonnet-4-6',
     promptHash:p.snapshot.promptHash,sourceCommit:manifest.sourceCommit,reservedCostUsd:p.reserve,requestConfiguration:p.body,...result};
   if(result.ok){row.costUsd=costFromUsage(result.usage,SONNET_RATE);
     if(result.resolvedModel!=='claude-sonnet-4-6'||(result.serviceTier&&result.serviceTier!=='standard'))row.accountingWarning='PROVIDER_CONFIG_DIFFERED';
     if(!row.accountingWarning)ledger.settle(p.reserve,row.costUsd);
   }
   summary.rows.push(row);summary.sonnetCostUsd=ledger.usageCost;summary.cumulativeCostUsd=prior+ledger.usageCost;
   summary.committedOrReservedUsd=ledger.committed;
   await persist('summary.json',summary);await persist('outputs.json',summary.rows);
   console.log(JSON.stringify({caseId:row.caseId,status:row.status??row.error,costUsd:row.costUsd,latencyMs:row.latencyMs,cumulativeCostUsd:summary.cumulativeCostUsd}));
   if(!result.ok||row.accountingWarning){summary.blocker={phase:'generation',error:result.error??row.accountingWarning};await persist('summary.json',summary);break;}
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{
 const safe=/^(PROVENANCE_MISMATCH|PRIOR_COST_INVALID|UNSUPPORTED_INPUT_COUNT|SPENDING_CAP|COST_BOUND_EXCEEDED|ANTHROPIC_KEY_REQUIRED|INVALID_USAGE|UNEXPECTED_CACHE_TTL)$/.test(error.message)?error.message:'LOCAL_OR_PROVIDER_FAILURE';
 console.error(`SONNET_PILOT_STOPPED: ${safe}. No automatic retry.`);process.exitCode=1;
});
