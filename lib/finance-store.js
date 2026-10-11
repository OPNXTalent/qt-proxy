import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
const context = new AsyncLocalStorage();
export const FINANCE_PRICE_VERSION = 'standard-2026-10-04';
export function financeEnabled(env = process.env) {
  return env.VERCEL_ENV === 'preview' || env.PRISM_FINANCE_ENABLED === 'true';
}
export function withFinanceRequest(fn) {
  return context.run({ requestId: randomUUID() }, fn);
}
export function setFinanceApplicationId(id) {
  const value = context.getStore(); if (value) value.applicationId = id;
}
export async function financeRest(path, { method = 'GET', body, headers = {} } = {},
  { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('FINANCE_NOT_CONFIGURED');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const r = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/${path}`, {
      method, signal: controller.signal,
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!r.ok) throw new Error('FINANCE_DATA_UNAVAILABLE');
    return r.status === 204 ? null : await r.json();
  } finally { clearTimeout(timer); }
}
const money = n => Number(n.toFixed(9));
export function priceUsage(t) {
  if (!t.usageKnown || t.provider !== 'openai') return null;
  const input = t.inputTokens, output = t.outputTokens ?? 0;
  const read = t.cacheReadInputTokens ?? 0, write = t.cacheCreationInputTokens ?? 0;
  if ([input, output, read, write].some(n => !Number.isSafeInteger(n) || n < 0)
    || read + write > input) return null;
  if (t.model === 'text-embedding-3-small') return money(input * .02 / 1e6);
  if (t.model !== 'gpt-6-luna' || !['default', 'standard'].includes(t.serviceTier)) return null;
  const long = input > 272000;
  return money(((input - read - write) * .10 * (long ? 2 : 1)
    + read * .01 * (long ? 2 : 1) + write * .125 * (long ? 2 : 1)
    + output * .50 * (long ? 1.5 : 1)) / 1e6);
}
async function safeWrite(path, options) {
  try { await financeRest(path, options); return true; }
  catch { console.warn('[prism-finance] capture_write_failed'); return false; }
}
export async function beginFinanceAttempt({ model, stage, turnType }) {
  if (!financeEnabled()) return null;
  const value = context.getStore();
  // Offline adapters and qualification runners are deliberately outside capture.
  if (!value) return null;
  const attempt = { attempt_id: randomUUID(), request_id: value.requestId,
    application_id: value.applicationId || null, model, stage, turn_type: turnType,
    state: 'dispatching', usage_known: false, cost_usd: null,
    environment: process.env.VERCEL_ENV || 'production' };
  const recorded = await safeWrite('prism_finance_usage', { method: 'POST', body: attempt,
    headers: { Prefer: 'return=minimal' } });
  // A dispatch must have a durable unknown-cost placeholder before paid access.
  if (!recorded) throw new Error('FINANCE_CAPTURE_UNAVAILABLE');
  return attempt.attempt_id;
}
export async function finishFinanceAttempt(id, t) {
  if (!id) return;
  const cost = priceUsage(t);
  await safeWrite(`prism_finance_usage?attempt_id=eq.${id}`, { method: 'PATCH',
    headers: { Prefer: 'return=minimal' }, body: {
      state: t.succeeded ? 'completed' : 'failed', provider: t.provider,
      provider_request_id: t.providerRequestId || null, model: t.model,
      usage_known: Boolean(t.usageKnown), input_tokens: t.inputTokens,
      output_tokens: t.outputTokens ?? null, cached_tokens: t.cacheReadInputTokens ?? null,
      cache_write_tokens: t.cacheCreationInputTokens ?? null, reasoning_tokens: t.reasoningTokens ?? null,
      latency_ms: t.latencyMs, cost_usd: cost,
      price_version: cost === null ? null : FINANCE_PRICE_VERSION,
      cost_status: cost === null ? 'unknown' : 'usage_derived',
    } });
}
export async function linkFinanceCompletion({ completionKey, threadId }) {
  const value = context.getStore();
  if (!financeEnabled() || !value) return;
  await safeWrite(`prism_finance_usage?request_id=eq.${value.requestId}`, { method: 'PATCH',
    headers: { Prefer: 'return=minimal' }, body: { completion_key: completionKey, thread_id: threadId || null } });
}
export function paymentFromStripe(event, product) {
  const o = event.data?.object;
  if (!o || typeof o.id !== 'string' || !Number.isSafeInteger(event.created)) return null;
  let amount, credits = 0, key;
  if (event.type === 'invoice.payment_succeeded' && o.subscription) {
    amount = o.amount_paid; credits = product.subscription.monthlyCredits; key = `invoice:${o.id}`;
  } else if (event.type === 'payment_intent.succeeded' && !o.invoice && product.queryBanks[o.amount]) {
    amount = o.amount_received; credits = product.queryBanks[o.amount]; key = `payment:${o.id}`;

  } else return null;
  if (!Number.isSafeInteger(amount) || o.currency !== 'usd') return null;
  return { payment_key: key, event_id: event.id, amount_usd: amount / 100, credits_granted: credits,
    fee_usd: null, source: 'stripe_webhook', occurred_at: new Date(event.created * 1000).toISOString(),
    test_mode: event.livemode !== true };
}
export async function recordStripeFinance(event, product) {
  if (!financeEnabled()) return;
  const payment = paymentFromStripe(event, product);
  if (!payment) return;
  // Immutable receipts: replaying a webhook must not erase a reconciled fee or
  // change the event ID used by credit allocations.
  const ok = await safeWrite('prism_finance_payments?on_conflict=payment_key', { method: 'POST', body: payment,
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' } });
  if (!ok) throw new Error('FINANCE_PAYMENT_RECORD_FAILED');
}
