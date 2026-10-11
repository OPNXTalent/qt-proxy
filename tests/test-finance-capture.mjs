import assert from 'node:assert/strict';
import { withFinanceRequest, beginFinanceAttempt, finishFinanceAttempt, linkFinanceCompletion, recordStripeFinance } from '../lib/finance-store.js';
import { PRISM_PRODUCT } from '../lib/product-config.js';
process.env.VERCEL_ENV='preview';process.env.SUPABASE_URL='https://test.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-secret';
const original=globalThis.fetch;let writes=[];let fail=false;
globalThis.fetch=async(url,o)=>{if(fail)throw Error('offline failure');writes.push({url,body:JSON.parse(o.body),headers:o.headers});return{ok:true,status:204};};
try {
 assert.equal(await beginFinanceAttempt({model:'gpt-6-luna',stage:'initial',turnType:'initial'}),null);
 await Promise.all(['first','second'].map(stage=>withFinanceRequest(async()=>{
  const id=await beginFinanceAttempt({model:'gpt-6-luna',stage,turnType:'initial'});
  await finishFinanceAttempt(id,{provider:'openai',model:'gpt-6-luna',serviceTier:'default',usageKnown:false,succeeded:false,latencyMs:5});
  await linkFinanceCompletion({completionKey:stage,threadId:null});
 })));
 const starts=writes.filter(w=>w.body.state==='dispatching');assert.equal(starts.length,2);assert.notEqual(starts[0].body.request_id,starts[1].body.request_id);assert.equal(starts[0].body.cost_usd,null);
 assert(writes.filter(w=>w.body.state==='failed').every(w=>w.body.cost_usd===null));
 for(const s of starts)assert(writes.some(w=>w.url.includes(s.body.request_id)&&w.body.completion_key===s.body.stage));
 fail=true;await assert.rejects(()=>withFinanceRequest(()=>beginFinanceAttempt({model:'gpt-6-luna',stage:'initial',turnType:'initial'})),/FINANCE_CAPTURE_UNAVAILABLE/);
 fail=false;await recordStripeFinance({id:'event',created:1,type:'payment_intent.succeeded',data:{object:{id:'pi',amount:1999,amount_received:1999,currency:'usd'}}},PRISM_PRODUCT);
 assert(writes.at(-1).headers.Prefer.includes('ignore-duplicates'),'Webhook replay must preserve reconciled fees and original allocation event');
 console.log('Finance capture: pre-dispatch durability, failure unknowns, request isolation and immutable payment receipts passed');
} finally {globalThis.fetch=original;}
