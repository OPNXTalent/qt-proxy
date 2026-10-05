import assert from 'node:assert/strict';
import { priceUsage, financeEnabled, paymentFromStripe } from '../lib/finance-store.js';
import { summarizeFinance } from '../lib/finance-summary.js';
import { createFinanceHandler, validatePriceDraft, reportingRange } from '../lib/finance-handler.js';
import { PRISM_PRODUCT } from '../lib/product-config.js';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const draftId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const draft={action:'price_draft',submissionId:draftId,products:[{key:'subscription',priceCents:999,credits:100},{key:'bank',priceCents:1999,credits:125}],freeCredits:3};
assert.equal(validatePriceDraft(draft).products[0].priceCents,999);
for(const invalid of [{...draft,freeCredits:101},{...draft,products:[draft.products[0],draft.products[0]]},{...draft,products:[{...draft.products[0],priceCents:999.9},draft.products[1]]}])assert.throws(()=>validatePriceDraft(invalid),/INVALID/);
assert.throws(()=>reportingRange({from:'2026-99-01',to:'2026-10-10'}),/INVALID/);
assert.equal(financeEnabled({VERCEL_ENV:'production'}),false);
assert.equal(priceUsage({usageKnown:true,provider:'openai',model:'gpt-6-luna',serviceTier:'default',inputTokens:1000,cacheReadInputTokens:500,cacheCreationInputTokens:200,outputTokens:100,reasoningTokens:30}),.00011);
assert.equal(priceUsage({usageKnown:false}),null);
assert.equal(priceUsage({usageKnown:true,provider:'openai',model:'unverified',inputTokens:100,outputTokens:10}),null);
assert.equal(priceUsage({usageKnown:true,provider:'openai',model:'gpt-6-luna',serviceTier:'default',inputTokens:300000,outputTokens:100}),.060075);
const from='2026-10-01T00:00:00.000Z',to='2026-11-01T00:00:00.000Z',at='2026-10-05T00:00:00.000Z';
const coverage=['payments','hosting','database','other'].map(category=>({kind:'coverage',category,amount_usd:0,occurred_at:from,period_start:from,period_end:to}));
const summary=summarizeFinance({from,to,mode:'production',captureStartedAt:from,usage:[{created_at:at,cost_usd:.1,state:'completed',cost_status:'usage_derived',completion_key:'c',thread_id:'t'},{created_at:at,cost_usd:null,state:'failed',request_id:'r'}],payments:[{payment_key:'p',event_id:'event',amount_usd:9.99,fee_usd:null,test_mode:false,occurred_at:at}],expenses:coverage,allocations:[{allocation_key:'purchase:event',allocation_type:'purchase',user_id:owner,credits:100,created_at:at}],credits:[{completion_key:'c',thread_id:'t',user_id:owner,query_cost:2,submission_type:'primary',entitlement_source:'bank',created_at:at}]});
assert.equal(summary.totals.allocatedRevenueUsd,.1998);
assert.equal(summary.totals.cashReceivedUsd,9.99);
assert.equal(summary.totals.initialQueries,1);
assert.equal(summary.totals.followUpQueries,0);
assert.equal(summary.totals.netProfitUsd,null);
assert.equal(summary.totals.recordedCostProfitEstimateUsd,.0998);
assert.equal(summary.totals.unknownAttempts,1);
assert.equal(summary.totals.operatingProfitUsd,null);
assert(summary.alerts.some(a=>a.message.includes('invoice')));
assert(summary.alerts.some(a=>a.message.includes('fee')));
assert.equal(summary.totals.pendingPaidCredits,98);
const missing=summarizeFinance({from,to,credits:[{created_at:at,query_cost:2,entitlement_source:'bank',completion_key:'old'}]});
assert.equal(missing.totals.missingCapture,1);assert.equal(missing.totals.unmatchedBankCredits,2);assert.equal(missing.totals.operatingProfitUsd,null);
const payment=paymentFromStripe({id:'evt',type:'payment_intent.succeeded',created:1,livemode:false,data:{object:{id:'pi',amount:1999,amount_received:1999,currency:'usd'}}},PRISM_PRODUCT);
assert.equal(payment.amount_usd,19.99);assert.equal(payment.fee_usd,null);assert.equal(payment.test_mode,true);
assert.equal(paymentFromStripe({type:'payment_intent.succeeded',created:1,data:{object:{id:'pi',amount:100,currency:'usd'}}},PRISM_PRODUCT),null);
let writes=[];let isOwner=true;let verified=false;
const mock=async(url,options={})=>{
 if(url.includes('/auth/v1/user')){verified=true;return{ok:true,json:async()=>({id:owner,email:'owner@example.invalid',user_metadata:{owner:true}})};}
 assert(verified,'Server identity must be verified before reading owner records');
 if(url.includes('prism_finance_owners'))return{ok:true,json:async()=>isOwner?[{user_id:owner}]:[]};
 if(options.method==='POST'){writes.push({url,options,body:JSON.parse(options.body)});return{ok:true,status:204};}
 return{ok:true,json:async()=>[]};
};
const handler=createFinanceHandler({env:{VERCEL_ENV:'preview',SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'server-test'},fetchImpl:mock});
const res=()=>({headers:{},status(n){this.code=n;return this;},setHeader(k,v){this.headers[k]=v;},json(b){this.body=b;return this;}});
let r=res();await handler({method:'GET',headers:{},query:{}},r);assert.equal(r.code,401);assert.equal(writes.length,0);
isOwner=false;r=res();await handler({method:'POST',headers:{authorization:'Bearer test','content-type':'application/json'},body:draft},r);assert.equal(r.code,403);assert.equal(writes.length,0);
isOwner=true;r=res();await handler({method:'POST',headers:{authorization:'Bearer test','content-type':'application/json'},body:draft},r);assert.equal(r.code,200);assert.equal(writes.length,1);assert.equal(writes[0].body.created_by,owner);assert.equal(writes[0].body.status,'draft');assert.equal(writes[0].body.products[0].priceCents,999);assert(writes[0].options.headers.Prefer.includes('ignore-duplicates'));assert(!JSON.stringify(r.body).includes('server-test'));
r=res();await handler({method:'POST',headers:{authorization:'Bearer test','content-type':'application/json'},body:{...draft,freeCredits:101}},r);assert.equal(r.code,400);assert.equal(writes.length,1);
assert.equal(PRISM_PRODUCT.subscription.monthlyPriceCents,4999,'Draft must not modify published checkout/fulfillment config');
console.log('Owner finance: authorization, price drafts, cost math, unknown costs and FIFO attribution passed');

const countReport=summarizeFinance({from,to,mode:'production',captureStartedAt:from,expenses:coverage,credits:[
 {created_at:at,completion_key:'initial',submission_type:'primary',query_cost:2,entitlement_source:'explorer'},
 {created_at:at,completion_key:'follow',submission_type:'follow_up',query_cost:1,entitlement_source:'explorer'},
 {created_at:at,completion_key:'follow',submission_type:'follow_up',query_cost:1,entitlement_source:'explorer'},
 {created_at:to,completion_key:'outside',submission_type:'primary',query_cost:2,entitlement_source:'explorer'}
]});
assert.equal(countReport.totals.initialQueries,1);assert.equal(countReport.totals.followUpQueries,1);assert.equal(countReport.totals.completedQueries,2);
const profitReport=summarizeFinance({from,to,mode:'production',captureStartedAt:from,expenses:[...coverage,{kind:'expense',category:'hosting',amount_usd:1,occurred_at:from}],payments:[{event_id:'sale',amount_usd:10,fee_usd:0,test_mode:false,occurred_at:from}],allocations:[{allocation_key:'purchase:sale',allocation_type:'purchase',user_id:owner,credits:100,created_at:from}],credits:[{user_id:owner,created_at:at,completion_key:'paid',submission_type:'primary',query_cost:2,entitlement_source:'bank'}],usage:[{created_at:at,completion_key:'paid',state:'completed',cost_usd:.01,cost_status:'invoice_reconciled'}]});
assert.equal(profitReport.totals.netProfitUsd,-.81,'Prepaid cash must not become earned profit');assert.equal(profitReport.totals.knownCashResultUsd,8.99);
console.log('Headline counts: distinct completed queries by type; earned profit separated from prepaid cash passed');
