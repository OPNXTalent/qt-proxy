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
        // Send welcome email via Resend
if (email && status === 'active') {
  const tierNames = {
    scholar: 'Scholar',
    theologian: 'Theologian',
    companion: 'Companion'
  };
  const tierName = tierNames[tier] || 'Scholar';
  const tierDesc = {
    scholar: '150 queries per month to the Quantum Theology Prism.',
    theologian: '350 queries per month to the Quantum Theology Prism.',
    companion: '500 queries per month to the Quantum Theology Prism.'
  }[tier] || '';

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'noreply@quantumtheology.app',
        to: email,
        subject: `Welcome to the QT Prism — ${tierName}`,
        html: `
          <div style="background:#06060a; color:#d8d4e8; font-family:Georgia,serif; max-width:600px; margin:0 auto; padding:48px 40px;">
            <div style="text-align:center; margin-bottom:32px;">
              <div style="font-family:serif; font-size:28px; color:#e8d5a0; letter-spacing:0.08em;">Quantum Theology</div>
              <div style="font-size:14px; color:#7a6230; letter-spacing:0.2em; text-transform:uppercase; margin-top:4px;">Echad b'Emet</div>
            </div>
            <div style="border-top:1px solid #2a2a40; margin-bottom:32px;"></div>
            <p style="font-size:18px; line-height:1.8; color:#d8d4e8;">Your <strong style="color:#e8d5a0;">${tierName}</strong> subscription is active.</p>
            <p style="font-size:16px; line-height:1.8; color:#7a7890;">${tierDesc} The framework applies relational ontology, Hebrew linguistic architecture, and the conceptual language of quantum mechanics to Scripture.</p>
            <div style="text-align:center; margin:40px 0;">
              <a href="https://quantumtheology.app/qt.html" style="font-family:monospace; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#e8d5a0; text-decoration:none; border:1px solid #7a6230; padding:14px 32px;">Enter the Prism →</a>
            </div>
            <div style="border-top:1px solid #2a2a40; margin-top:32px; padding-top:24px;">
              <p style="font-size:13px; color:#3a384a; text-align:center;">Manage your subscription at <a href="https://billing.stripe.com" style="color:#7a6230;">billing.stripe.com</a> · Questions? <a href="mailto:support@quantumtheology.app" style="color:#7a6230;">support@quantumtheology.app</a></p>
            </div>
          </div>
        `
      })
    });
  } catch (emailErr) {
    console.error('Welcome email failed:', emailErr.message);
  }
}
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
