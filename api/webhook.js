import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function verifyStripeSignature(header, payload, secret) {
  const parts = header.split(',');
  let timestamp = '';
  let signature = '';
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') signature = value;
  }
  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  if (expected !== signature) throw new Error('Invalid signature');
  return JSON.parse(payload);
}

async function getCustomerEmail(customerId) {
  try {
    const res = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
    });
    const data = await res.json();
    return data.email || null;
  } catch {
    return null;
  }
}

async function upsertSubscriber(email, customerId, subscriptionId, tier, status) {
  if (!email) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      email,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      tier,
      status,
      updated_at: new Date().toISOString()
    })
  });
  if (!res.ok) console.error('Supabase upsert error:', await res.text());
}

async function updateSubscriberStatus(subscriptionId, status) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscribers?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() })
    }
  );
  if (!res.ok) console.error('Supabase update error:', await res.text());
}

function getTierFromAmount(amount) {
  if (amount >= 19900) return 'companion';
  if (amount >= 2499) return 'theologian';
  return 'scholar';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'No signature' });

  let event;
  try {
    const buf = await buffer(req);
    event = verifyStripeSignature(sig, buf.toString('utf8'), STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer;
        const subscriptionId = sub.id;
        const status = sub.status === 'active' ? 'active' : 'inactive';
        const amount = sub.items?.data?.[0]?.price?.unit_amount || 0;
        const tier = getTierFromAmount(amount);
        const email = await getCustomerEmail(customerId);
        await upsertSubscriber(email, customerId, subscriptionId, tier, status);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await updateSubscriberStatus(sub.id, 'inactive');
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await updateSubscriberStatus(invoice.subscription, 'active');
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    return res.status(500).json({ error: 'Handler error' });
  }

  return res.status(200).json({ received: true });
}
