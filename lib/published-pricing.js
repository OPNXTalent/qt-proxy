import { financeRest } from './finance-store.js';
import { publicProductConfig, PRISM_PRODUCT } from './product-config.js';
export async function loadPublishedPricing({env=process.env,fetchImpl=globalThis.fetch}={}) {
 const rows=await financeRest('prism_pricing_versions?select=version_id,products,stripe&active=eq.true&limit=1',{}, {env,fetchImpl});
 const row=rows[0];
 if(!row)return {...publicProductConfig(env),pricingVersion:null};
 const sub=row.products.find(p=>p.key==='subscription'),bank=row.products.find(p=>p.key==='bank');
 return {...publicProductConfig(env),pricingVersion:row.version_id,subscription:{monthlyPriceCents:sub.priceCents,monthlyCredits:sub.credits},queryBanks:{[bank.priceCents]:bank.credits},checkoutUrls:{subscription:row.stripe.subscription.url,bank125:row.stripe.bank.url}};
}
export async function stripeRequest(path,fields,{env=process.env,fetchImpl=globalThis.fetch,idempotencyKey}={}) {
 if(!env.STRIPE_SECRET_KEY)throw Error('PRICING_STRIPE_NOT_CONFIGURED');
 const r=await fetchImpl('https://api.stripe.com/v1/'+path,{method:fields?'POST':'GET',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,...(fields?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},...(fields?{body:new URLSearchParams(fields).toString()}:{})});
 const data=await r.json();if(!r.ok)throw Error('PRICING_STRIPE_OPERATION_FAILED');return data;
}
export async function publishPricing({draft,versionId,expectedVersion,ownerId},{env=process.env,fetchImpl=globalThis.fetch}={}) {
 const options={env,fetchImpl};
 if(draft.freeCredits!==PRISM_PRODUCT.explorer.credits)throw Error('INVALID_FREE_ALLOWANCE_CHANGE');
 const existing=await financeRest(`prism_pricing_versions?version_id=eq.${versionId}&select=version_id,active`,{},options);
 if(existing[0]?.active)return {published:true,pricingVersion:versionId};
 const current=await loadPublishedPricing(options);
 if((expectedVersion||null)!==current.pricingVersion)throw Error('PRICING_VERSION_CONFLICT');
 const stripe={};
 for(const p of draft.products){
  const metadata={'metadata[prism_pricing_version]':versionId,'metadata[prism_product]':p.key};
  const product=await stripeRequest('products',{name:p.key==='subscription'?`Prism Monthly Membership — ${p.credits} credits`:`Prism Credit Bank — ${p.credits} credits`,...metadata},{...options,idempotencyKey:`prism-price-${versionId}-${p.key}-product`});
  const price=await stripeRequest('prices',{product:product.id,currency:'usd',unit_amount:String(p.priceCents),...(p.key==='subscription'?{'recurring[interval]':'month'}:{}),...metadata},{...options,idempotencyKey:`prism-price-${versionId}-${p.key}-price`});
  const prefix=p.key==='subscription'?'subscription_data':'payment_intent_data';
  const link=await stripeRequest('payment_links',{'line_items[0][price]':price.id,'line_items[0][quantity]':'1',...(p.key==='bank'?{customer_creation:'always'}:{}),[`${prefix}[metadata][prism_pricing_version]`]:versionId,[`${prefix}[metadata][prism_product]`]:p.key,...metadata},{...options,idempotencyKey:`prism-price-${versionId}-${p.key}-link`});
  if(!/^https:\/\/buy\.stripe\.com\//.test(link.url)||link.livemode!==(env.VERCEL_ENV==='production'))throw Error('PRICING_CHECKOUT_MODE_INVALID');
  stripe[p.key]={productId:product.id,priceId:price.id,linkId:link.id,url:link.url};
 }
 await financeRest('rpc/publish_prism_pricing',{method:'POST',body:{p_version_id:versionId,p_expected_version:expectedVersion||null,p_products:draft.products,p_stripe:stripe,p_owner_id:ownerId}},options);
 return {published:true,pricingVersion:versionId,message:'Published. New purchases use these prices and credit allowances. Existing subscriptions keep their terms.'};
}
export async function resolveStripeProduct(object,kind,{env=process.env,fetchImpl=globalThis.fetch}={}) {
 let metadata=object.metadata || {};
 if(kind==='subscription' && !metadata.prism_pricing_version){
  metadata=object.subscription_details?.metadata || object.parent?.subscription_details?.metadata || object.lines?.data?.[0]?.price?.metadata || {};
  if(!metadata.prism_pricing_version && object.subscription){const sub=await stripeRequest(`subscriptions/${encodeURIComponent(object.subscription)}`,null,{env,fetchImpl});return resolveStripeProduct(sub,kind,{env,fetchImpl});}
 }
 if(metadata.prism_pricing_version){
  if(!/^[0-9a-f-]{36}$/i.test(metadata.prism_pricing_version)||metadata.prism_product!==kind)throw Error('PRICING_METADATA_INVALID');
  const rows=await financeRest(`prism_pricing_versions?version_id=eq.${metadata.prism_pricing_version}&select=products,stripe`,{},{env,fetchImpl});
  const p=rows[0]?.products.find(p=>p.key===kind);if(!p)throw Error('PRICING_VERSION_UNKNOWN');
  const amount=object.items?.data?.[0]?.price?.unit_amount ?? object.amount ?? object.lines?.data?.[0]?.price?.unit_amount;
  if(amount!==undefined && amount!==p.priceCents)throw Error('PRICING_AMOUNT_MISMATCH');
  return p;
 }
 const amount=object.items?.data?.[0]?.price?.unit_amount ?? object.amount ?? object.lines?.data?.[0]?.price?.unit_amount;
 if(kind==='bank' && !object.invoice && PRISM_PRODUCT.queryBanks[amount])return {key:kind,priceCents:amount,credits:PRISM_PRODUCT.queryBanks[amount]};
 if(kind==='subscription' && amount===PRISM_PRODUCT.subscription.monthlyPriceCents)return {key:kind,priceCents:amount,credits:PRISM_PRODUCT.subscription.monthlyCredits};
 return null;
}
