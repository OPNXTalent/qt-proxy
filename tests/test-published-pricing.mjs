import assert from 'node:assert/strict';
import { loadPublishedPricing,publishPricing,resolveStripeProduct } from '../lib/published-pricing.js';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const draft={freeCredits:5,products:[{key:'subscription',priceCents:999,credits:100},{key:'bank',priceCents:999,credits:100}]};
const env={VERCEL_ENV:'production',STRIPE_SECRET_KEY:'fake',SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake'};
let calls=[],published=false;
const mock=async(url,init={})=>{
 calls.push({url,init});
 if(url.includes('api.stripe.com')){
  const fields=new URLSearchParams(init.body);
  if(url.endsWith('prices'))assert.equal(fields.get('unit_amount'),'999');
  if(url.endsWith('payment_links'))assert.equal(fields.get('line_items[0][quantity]'),'1');
  return new Response(JSON.stringify({id:url.endsWith('products')?'prod_test':'price_test',url:'https://buy.stripe.com/verified',livemode:true}));
 }
 if(url.includes('/rpc/')){published=true;return new Response('true');}
 return new Response('[]');
};
assert.equal((await loadPublishedPricing({env,fetchImpl:mock})).subscription.monthlyPriceCents,4999);
await publishPricing({draft,versionId:id,expectedVersion:null,ownerId:id},{env,fetchImpl:mock});
assert(published);assert.equal(calls.filter(c=>c.url.includes('stripe.com')).length,6);
const links=calls.filter(c=>c.url.endsWith('payment_links')).map(c=>new URLSearchParams(c.init.body));
assert.equal(links[0].get('subscription_data[metadata][prism_pricing_version]'),id);
assert.equal(links[1].get('payment_intent_data[metadata][prism_product]'),'bank');
assert.equal(links[1].get('customer_creation'),'always');
assert(calls.filter(c=>c.url.includes('stripe.com')).every(c=>c.init.headers['Idempotency-Key']));
published=false;
await assert.rejects(()=>publishPricing({draft,versionId:id,expectedVersion:id,ownerId:id},{env,fetchImpl:mock}),/CONFLICT/);
assert.equal(published,false);
await assert.rejects(()=>publishPricing({draft:{...draft,freeCredits:3},versionId:id,ownerId:id},{env,fetchImpl:mock}),/FREE_ALLOWANCE/);
const versionMock=async()=>new Response(JSON.stringify([{products:draft.products,stripe:{}}]));
const payment={amount:999,metadata:{prism_pricing_version:id,prism_product:'bank'}};
assert.equal((await resolveStripeProduct(payment,'bank',{env,fetchImpl:versionMock})).credits,100);
await assert.rejects(()=>resolveStripeProduct({...payment,amount:1999},'bank',{env,fetchImpl:versionMock}),/MISMATCH/);
assert.equal((await resolveStripeProduct({amount:1999},'bank',{env,fetchImpl:mock})).credits,125,'Historical packages retain their allowances');
console.log('Published pricing: Stripe metadata, immutable prices, stale publication rejection and historical fulfillment passed');
