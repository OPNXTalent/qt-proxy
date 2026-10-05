import './require-preview-isolation.js';
import { randomUUID } from 'node:crypto';
import { verifySupabaseIdentity } from './server-auth.js';
import { financeEnabled, financeRest } from './finance-store.js';
import { summarizeFinance } from './finance-summary.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const categories = ['hosting','database','processing','other','payments'];
const clean = (s, max=160) => typeof s === 'string' && s.trim().length <= max ? s.trim() : null;
export function reportingRange(query={}) {
  const now = new Date();
  const date = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
  const from = query.from || new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString().slice(0,10);
  const to = query.to || new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1)).toISOString().slice(0,10);
  if (!date(from) || !date(to) || to<=from || (Date.parse(to)-Date.parse(from))/86400000>93) throw new Error('INVALID_REPORT_RANGE');
  return {from:`${from}T00:00:00.000Z`,to:`${to}T00:00:00.000Z`};
}
export function validatePriceDraft(body) {
  if (!Array.isArray(body.products) || body.products.length!==2) throw new Error('INVALID_PRICE_DRAFT');
  const seen = new Set();
  const products=body.products.map(p=>{
    if (!['subscription','bank'].includes(p.key) || seen.has(p.key)
      || !Number.isSafeInteger(p.priceCents) || p.priceCents<50 || p.priceCents>100000
      || !Number.isSafeInteger(p.credits) || p.credits<1 || p.credits>10000) throw new Error('INVALID_PRICE_DRAFT');
    seen.add(p.key); return {key:p.key,priceCents:p.priceCents,credits:p.credits};
  });
  if (!Number.isSafeInteger(body.freeCredits) || body.freeCredits<0 || body.freeCredits>100) throw new Error('INVALID_PRICE_DRAFT');
  return {products,freeCredits:body.freeCredits,currency:'usd',status:'draft'};
}
export function createFinanceHandler({env=process.env,fetchImpl=globalThis.fetch}={}) {
  const db=(p,o)=>financeRest(p,o,{env,fetchImpl});
  async function all(table,columns,filter='') {
    const out=[];
    for(let offset=0;offset<20000;offset+=500){
      const rows=await db(`${table}?select=${columns}${filter}&order=created_at.asc,${{prism_finance_usage:'attempt_id',prism_finance_payments:'payment_key',prism_finance_expenses:'expense_id',prism_query_ledger:'completion_key',prism_credit_allocations:'allocation_key'}[table]}.asc&limit=500&offset=${offset}`);
      if(!Array.isArray(rows))throw new Error('FINANCE_DATA_UNAVAILABLE'); out.push(...rows);
      if(rows.length<500)return out;
    }
    throw new Error('FINANCE_REPORT_TOO_LARGE'); // Never silently truncate profit data.
  }
  return async function handler(req,res){
    res.setHeader('Cache-Control','private, no-store'); res.setHeader('Vary','Authorization');
    res.setHeader('X-Content-Type-Options','nosniff');
    if(!financeEnabled(env))return res.status(404).json({error:'Owner dashboard is not enabled'});
    const auth=await verifySupabaseIdentity({authorizationHeader:req.headers.authorization,
      supabaseUrl:env.SUPABASE_URL,supabaseAnonKey:env.SUPABASE_ANON_KEY,fetchImpl});
    if(!auth.identity)return res.status(auth.unavailable?503:401).json({error:'Sign in to your owner account'});
    try {
      const owners=await db(`prism_finance_owners?user_id=eq.${auth.identity.userId}&select=user_id&limit=1`);
      if(!owners?.length)return res.status(403).json({error:'Owner access required'});
      if(req.method==='GET'){
        const {from,to}=reportingRange(req.query);
        const [usage,payments,expenses,credits,allocations,settings,drafts]=await Promise.all([
          all('prism_finance_usage','attempt_id,request_id,completion_key,thread_id,stage,model,state,usage_known,input_tokens,output_tokens,cost_usd,cost_status,created_at,latency_ms',`&created_at=lt.${to}`),
          all('prism_finance_payments','payment_key,event_id,amount_usd,fee_usd,credits_granted,occurred_at,test_mode,created_at',`&occurred_at=lt.${to}`),
          all('prism_finance_expenses','expense_id,kind,category,amount_usd,reference,occurred_at,period_start,period_end,created_at',`&occurred_at=gte.${from}&occurred_at=lt.${to}`),
          all('prism_query_ledger','completion_key,thread_id,user_id,query_cost,submission_type,entitlement_source,created_at',`&created_at=lt.${to}`),
          all('prism_credit_allocations','allocation_key,allocation_type,user_id,credits,created_at',`&created_at=lt.${to}`),
          db('prism_finance_settings?select=capture_started_at,daily_alert_usd&limit=1'),
          db('prism_finance_price_drafts?select=draft_id,products,free_credits,status,created_at&order=created_at.desc&limit=20'),
        ]);
        const summary=summarizeFinance({usage,payments,expenses,credits,allocations,from,to,
          captureStartedAt:settings[0]?.capture_started_at,mode:env.VERCEL_ENV==='preview'?'preview':'production',
          spendAlertUsd:Number(settings[0]?.daily_alert_usd ?? 1)});
        return res.status(200).json({...summary,priceDrafts:drafts,dailyAlertUsd:Number(settings[0]?.daily_alert_usd??1)});
      }
      if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed'});}
      // JSON + bearer auth only: cookies are not sufficient for owner mutations.
      if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'JSON required'});
      const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
      if(!b || JSON.stringify(b).length>12000)throw new Error('INVALID_ENTRY');
      if(b.action==='price_draft'){
        const draft=validatePriceDraft(b);
        if(!uuid.test(b.submissionId||''))throw new Error('INVALID_ENTRY');
        await db('prism_finance_price_drafts?on_conflict=draft_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:{draft_id:b.submissionId,products:draft.products,free_credits:draft.freeCredits,status:'draft',created_by:auth.identity.userId}});
        return res.status(200).json({saved:true,status:'draft',message:'Price draft saved. Checkout and fulfillment remain on their published configuration.'});
      }
      if(b.action==='expense' || b.action==='coverage'){
        if(!uuid.test(b.submissionId||'') || !categories.includes(b.category) || !clean(b.reference)
          || !Number.isSafeInteger(b.amountCents) || Math.abs(b.amountCents)>100000000)throw new Error('INVALID_ENTRY');
        const range=reportingRange(b);
        const isCoverage=b.action==='coverage';
        if(isCoverage && b.amountCents!==0)throw new Error('INVALID_ENTRY');
        await db('prism_finance_expenses?on_conflict=expense_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:{expense_id:b.submissionId,kind:isCoverage?'coverage':'expense',category:b.category,amount_usd:b.amountCents/100,reference:clean(b.reference),occurred_at:range.from,period_start:range.from,period_end:range.to,created_by:auth.identity.userId}});
        return res.status(200).json({saved:true});
      }
      if(b.action==='alert'){
        if(!Number.isFinite(b.dailyAlertUsd) || b.dailyAlertUsd<.01 || b.dailyAlertUsd>10000)throw new Error('INVALID_ENTRY');
        await db('prism_finance_settings?id=eq.1',{method:'PATCH',headers:{Prefer:'return=minimal'},body:{daily_alert_usd:b.dailyAlertUsd}});
        return res.status(200).json({saved:true});
      }
      return res.status(400).json({error:'Unsupported owner action'});
    }catch(err){
      const invalid=err instanceof SyntaxError || /^INVALID_/.test(err.message);
      return res.status(invalid?400:503).json({error:invalid?'Check the entry and reporting dates':'Financial records are unavailable; no totals have been inferred'});
    }
  };
}
export default createFinanceHandler();
