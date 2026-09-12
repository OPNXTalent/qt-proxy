import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';

process.env.SUPABASE_URL = 'https://project.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.STRIPE_WEBHOOK_SECRET = 'webhook-secret';
process.env.STRIPE_SECRET_KEY = 'stripe-key';
process.env.RESEND_API_KEY = '';

const { default: handler } = await import('../api/webhook.js');

function signedRequest(event) {
  const payload = JSON.stringify(event);
  const timestamp = '1770000000';
  const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`).digest('hex');
  const req = Readable.from([payload]);
  req.method = 'POST';
  req.headers = { 'stripe-signature': `t=${timestamp},v1=${signature}` };
  return req;
}

function reply() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };
}

for (const [amount, expectedQueries] of [[1999, 125]]) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/rpc/credit_prism_bank_by_email')) return Response.json(true);
    if (String(url).includes('api.resend.com')) return Response.json({ id: 'email' });
    throw new Error(`Unexpected fetch: ${url}`);
  };
  const event = {
    id: `evt_bank_${expectedQueries}`,
    type: 'payment_intent.succeeded',
    data: { object: { id: `pi_${expectedQueries}`, amount, receipt_email: 'buyer@example.test' } },
  };
  const res = reply();
  await handler(signedRequest(event), res);
  assert.equal(res.statusCode, 200);
  const rpc = calls.find(call => call.url.includes('/rpc/credit_prism_bank_by_email'));
  assert.ok(rpc, `Missing bank fulfillment RPC for ${expectedQueries}`);
  assert.deepEqual(JSON.parse(rpc.options.body), {
    p_email: 'buyer@example.test',
    p_queries: expectedQueries,
    p_fulfillment_key: event.id,
  });
  assert.equal(calls.some(call => call.url.includes('/subscribers?') && /purchased_credits/.test(call.options.body || '')), false);
}

{
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    throw new Error(`Unexpected fetch: ${url}`);
  };
  const event = {
    id: 'evt_subscription_payment_intent',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_subscription', amount: 1999, invoice: 'in_legacy_subscription', receipt_email: 'member@example.test' } },
  };
  const res = reply();
  await handler(signedRequest(event), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 0, 'Subscription PaymentIntent must not fulfill the one-time credit bank');
}

{
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/rpc/apply_prism_subscription_by_email')) return Response.json(true);
    throw new Error(`Unexpected fetch: ${url}`);
  };
  const event = {
    id: 'evt_membership_period_1',
    type: 'invoice.payment_succeeded',
    data: { object: {
      id: 'in_period_1', subscription: 'sub_1', customer_email: 'member@example.test',
      lines: { data: [{ period: { start: 1770000000, end: 1772678400 } }] },
    } },
  };
  const res = reply();
  await handler(signedRequest(event), res);
  assert.equal(res.statusCode, 200);
  const rpc = calls.find(call => call.url.includes('/rpc/apply_prism_subscription_by_email'));
  assert.ok(rpc, 'Missing membership allocation RPC');
  const body = JSON.parse(rpc.options.body);
  assert.equal(body.p_fulfillment_key, event.id);
  assert.equal(body.p_credits, 350);
}

console.log('Webhook credit bank and membership idempotency-key checks passed');
