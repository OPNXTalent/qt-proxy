import { PRISM_PRODUCT } from './product-config.js';
const sum = (rows, key) => rows.reduce((n, r) => n + Number(r[key] || 0), 0);
const round = n => Number(n.toFixed(9));
const stamp = value => Date.parse(value);
const inRange = (r, from, to, key = 'created_at') => stamp(r[key]) >= stamp(from) && stamp(r[key]) < stamp(to);
export function summarizeFinance({ usage = [], payments = [], expenses = [], credits = [], allocations = [],
  from, to, captureStartedAt = null, mode = 'preview', spendAlertUsd = 1 }) {
  const u = usage.filter(r => inRange(r, from, to));
  const p = payments.filter(r => inRange(r, from, to, 'occurred_at'));
  const e = expenses.filter(r => inRange(r, from, to, 'occurred_at'));
  const c = credits.filter(r => inRange(r, from, to));
  const unknown = u.filter(r => r.cost_usd === null || r.cost_usd === undefined || r.state === 'dispatching');
  const missingCapture = c.filter(r => !usage.some(a => a.completion_key === r.completion_key));
  const knownAI = round(sum(u, 'cost_usd'));
  const cash = round(sum(p.filter(r => !r.test_mode), 'amount_usd'));
  const testCash = round(sum(p.filter(r => r.test_mode), 'amount_usd'));
  const refunds = round(-sum(p.filter(r => !r.test_mode && r.amount_usd < 0), 'amount_usd'));
  const feesKnown = round(sum(p.filter(r => !r.test_mode), 'fee_usd'));
  const feeUnknown = p.filter(r => !r.test_mode && r.amount_usd > 0 && r.fee_usd === null).length;
  const overhead = round(sum(e, 'amount_usd'));
  const reconciledSources = new Set(e.filter(r => r.kind === 'coverage' && r.amount_usd === 0).map(r => r.category));
  const gaps = [];
  if (!captureStartedAt || stamp(captureStartedAt) > stamp(from)) gaps.push('AI capture does not cover the full selected period.');
  if (unknown.length) gaps.push(`${unknown.length} provider attempts have an unknown charge or are pending.`);
  if (missingCapture.length) gaps.push(`${missingCapture.length} completed inquiries lack captured provider usage.`);
  if (u.some(r => r.cost_usd != null && r.cost_status !== 'invoice_reconciled')) gaps.push('Provider charges have not been reconciled against an invoice.');
  if (refunds) gaps.push('Refund effects on credit allocations require separate reconciliation.');
  if (feeUnknown) gaps.push(`${feeUnknown} payments need fee reconciliation.`);
  for (const source of ['payments', 'hosting', 'database', 'other']) {
    if (!reconciledSources.has(source)) gaps.push(`${source} statement coverage has not been confirmed for this exact period.`);
  }
  // Coverage confirmations must match the exact reporting range, not just fall within it.
  for (const source of [...reconciledSources]) {
    if (!e.some(r => r.kind === 'coverage' && r.category === source && stamp(r.period_start) === stamp(from) && stamp(r.period_end) === stamp(to))) {
      if (!gaps.some(s => s.startsWith(source))) gaps.push(`${source} coverage does not match the selected period.`);
    }
  }
  if (mode !== 'production') gaps.push('Preview data is isolated test activity, not business profit.');
  // Bank credits can include gifts. Never monetize the entire bank at a guessed price.
  const bank = c.filter(r => r.entitlement_source === 'bank');
  const free = c.filter(r => ['explorer', 'preview_test', 'trial', 'welcome'].includes(r.entitlement_source));
  const attributed = [];
  const lots = new Map();
  for (const a of [...allocations].sort((a,b) => stamp(a.created_at)-stamp(b.created_at) || a.allocation_key.localeCompare(b.allocation_key))) {
    if (!a.user_id || stamp(a.created_at) >= stamp(to)) continue;
    const payment = payments.find(p => ['purchase:', 'membership:'].some(prefix => a.allocation_key === prefix + p.event_id));
    const isPaid = ['purchase', 'membership'].includes(a.allocation_type);
    const unit = isPaid ? (payment && payment.amount_usd >= 0 && !payment.test_mode ? payment.amount_usd / a.credits : null) : 0;
    const list = lots.get(a.user_id) || [];
    list.push({ remaining: a.credits, created: a.created_at, unit, paid: isPaid }); lots.set(a.user_id, list);
  }
  let earned = 0, unmatchedBankCredits = 0, paidCredits = 0;
  for (const q of [...credits].filter(r => stamp(r.created_at) < stamp(to) && r.entitlement_source === 'bank').sort((a,b) => stamp(a.created_at)-stamp(b.created_at) || a.completion_key.localeCompare(b.completion_key))) {
    let remaining = q.query_cost, recognized = 0, unmatched = 0, paid = 0;
    for (const lot of lots.get(q.user_id) || []) {
      if (stamp(lot.created) > stamp(q.created_at) || !lot.remaining || !remaining) continue;
      const take = Math.min(remaining, lot.remaining); lot.remaining -= take; remaining -= take;
      if (lot.unit === null) unmatched += take; else recognized += take * lot.unit;
      if (lot.paid) paid += take;
    }
    unmatched += remaining;
    if (inRange(q, from, to)) { earned += recognized; unmatchedBankCredits += unmatched; paidCredits += paid; attributed.push({ completionKey:q.completion_key, allocatedRevenueUsd:round(recognized), unmatchedCredits:unmatched }); }
  }
  if (unmatchedBankCredits) gaps.push(`${unmatchedBankCredits} banked credits have no attributable payment history.`);
  const conversations = new Map();
  for (const a of u) {
    const key = a.thread_id || `unlinked:${a.request_id}`;
    const entry = conversations.get(key) || { threadId:a.thread_id, requestId:a.thread_id ? null : a.request_id,
      knownCostUsd:0, unknownAttempts:0, stages:0, credits:0 };
    entry.knownCostUsd += Number(a.cost_usd || 0); entry.stages++;
    if (a.cost_usd === null || a.state === 'dispatching') entry.unknownAttempts++;
    conversations.set(key, entry);
  }
  for (const q of c) {
    const key = q.thread_id || `unlinked-completion:${q.completion_key}`;
    const entry = conversations.get(key) || {threadId:q.thread_id,requestId:null,knownCostUsd:0,unknownAttempts:0,stages:0,credits:0};
    entry.credits += q.query_cost; conversations.set(key,entry);
  }
  const daily = new Map();
  for (const a of u) { const date = a.created_at.slice(0,10); const d = daily.get(date) || {date,knownCostUsd:0,unknownAttempts:0}; d.knownCostUsd += Number(a.cost_usd||0); if(a.cost_usd===null || a.state==='dispatching')d.unknownAttempts++;daily.set(date,d); }
  const alerts = gaps.map(message => ({ severity:'warning',message }));
  if ([...daily.values()].some(d => d.knownCostUsd > spendAlertUsd)) alerts.unshift({severity:'critical',message:`Recorded daily AI spending exceeded USD ${spendAlertUsd.toFixed(2)}.`});
  if (u.some(r => r.state === 'failed' && Number(r.cost_usd)>0)) alerts.push({severity:'warning',message:'Failed provider attempts incurred costs; they are included in AI spend.'});
  const knownCashResult = round(cash - feesKnown - overhead - knownAI);
  return { from,to,mode,generatedAt:new Date().toISOString(),captureStartedAt,
    totals:{cashReceivedUsd:cash,refundsUsd:refunds,testCashUsd:testCash,knownAiCostUsd:knownAI,
      recordedFeesUsd:feesKnown,recordedExpensesUsd:overhead,knownCashResultUsd:knownCashResult,
      operatingProfitUsd:gaps.length ? null : knownCashResult,
      allocatedRevenueUsd:round(earned),allocatedRevenueMethod:'FIFO estimate; not audited revenue recognition',
      unmatchedBankCredits,bankCredits:sum(bank,'query_cost'),paidLotCredits:paidCredits,
      freeCredits:sum(free,'query_cost'),totalCredits:sum(c,'query_cost'),
      failedAttempts:u.filter(r=>r.state==='failed').length,unknownAttempts:unknown.length,
      unlinkedAttempts:u.filter(r=>!r.completion_key).length,missingCapture:missingCapture.length,
      pendingPaidCredits:[...lots.values()].flat().filter(l=>l.paid).reduce((n,l)=>n+l.remaining,0)},
    alerts,configuredProducts:PRISM_PRODUCT,
    payments:p.map(({payment_key,amount_usd,fee_usd,occurred_at,test_mode})=>({payment_key,amount_usd,fee_usd,occurred_at,test_mode})),
    conversations:[...conversations.values()].map(r=>({...r,knownCostUsd:round(r.knownCostUsd)})).sort((a,b)=>b.knownCostUsd-a.knownCostUsd).slice(0,50),
    daily:[...daily.values()].map(r=>({...r,knownCostUsd:round(r.knownCostUsd)})).sort((a,b)=>a.date.localeCompare(b.date)),
    usage:u.slice(-100).reverse().map(({attempt_id,stage,model,state,cost_usd,cost_status,input_tokens,output_tokens,created_at,latency_ms})=>({attempt_id,stage,model,state,cost_usd,cost_status,input_tokens,output_tokens,created_at,latency_ms})),
    expenses:e.filter(r=>r.kind!=='coverage'),attributed,
    disclosure:'USD only. Provider charges are usage-derived until reconciled against invoices. No question text, answers, emails or keys are returned. Coverage starts when capture is enabled; this is not a historical backfill.' };
}
