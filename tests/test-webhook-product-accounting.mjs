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

for (const [amount, expectedQueries] of [[999, 10], [1999, 25]]) {
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

console.log('Webhook Query Bank product and idempotency-key checks passed');
