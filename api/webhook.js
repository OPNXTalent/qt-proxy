import crypto from 'crypto';
import { PRISM_PRODUCT, queryBankCreditsForAmount } from '../lib/product-config.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// ── Tier configuration ──────────────────────────────────────────────
// Maps Stripe price amounts (in cents) to internal tier keys
// and their monthly query limits
const TIER_CONFIG = {
  [PRISM_PRODUCT.subscription.monthlyPriceCents]: {
    tier: 'prism',
    limit: PRISM_PRODUCT.subscription.monthlyQueries,
  },
};

// ── Stripe payment link product IDs → Signal Sessions ──────────────
// Used to distinguish one-time Signal purchases from subscriptions
// in payment_intent.succeeded events
const SIGNAL_AMOUNTS = new Set(Object.keys(PRISM_PRODUCT.queryBanks).map(Number));

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

function supabaseHeaders() {
  return {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function prismRpc(name, body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${name} failed: ${response.status}`);
  return response.json();
}

// Upsert subscriber on new subscription — sets tier, limit, reset date
async function upsertSubscriber(email, customerId, subscriptionId, tier, status) {
  if (!email) return;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/subscribers?on_conflict=email`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(),
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

async function applyPrismSubscription(email, status, periodStart, periodEnd) {
  if (!email) return;
  await prismRpc('apply_prism_subscription_by_email', {
    p_email: email,
    p_status: status,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });
}

// Update tier/status on subscription change
async function updateSubscription(subscriptionId, tier, limit, status) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscribers?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}`,
    {
      method: 'PATCH',
      headers: { ...supabaseHeaders(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ tier, status, updated_at: new Date().toISOString() })
    }
  );
  if (!res.ok) console.error('Supabase update error:', await res.text());
}

// Customer Query balances live only in prism_entitlements. The subscribers
// row remains profile/subscription metadata and is not an accounting ledger.
async function creditQueryBank(email, credits, fulfillmentKey) {
  if (!email || !credits) return;
  await prismRpc('credit_prism_bank_by_email', {
    p_email: email,
    p_queries: credits,
    p_fulfillment_key: fulfillmentKey,
  });
}

async function updateSubscriberStatus(subscriptionId, status) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscribers?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}`,
    {
      method: 'PATCH',
      headers: { ...supabaseHeaders(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() })
    }
  );
  if (!res.ok) console.error('Supabase status update error:', await res.text());
}

async function sendEmail(to, subject, html) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'noreply@quantumtheology.app',
      to,
      subject,
      html
    })
  });
}

function emailWrapper(content) {
  return `
    <div style="background:#06060a; color:#d8d4e8; font-family:Georgia,serif; max-width:600px; margin:0 auto; padding:48px 40px;">
      <div style="text-align:center; margin-bottom:32px;">
        <div style="font-family:serif; font-size:28px; color:#e8d5a0; letter-spacing:0.08em;">The Prism</div>
        <div style="font-size:14px; color:#7a6230; letter-spacing:0.2em; text-transform:uppercase; margin-top:4px;">Echad b'Emet</div>
      </div>
      <div style="border-top:1px solid #2a2a40; margin-bottom:32px;"></div>
      ${content}
      <div style="border-top:1px solid #2a2a40; margin-top:32px; padding-top:24px;">
        <p style="font-size:13px; color:#3a384a; text-align:center;">Questions? <a href="mailto:support@quantumtheology.app" style="color:#7a6230;">support@quantumtheology.app</a></p>
      </div>
    </div>
  `;
}

const TIER_DISPLAY = {
  prism: 'Prism',
};

const TIER_DESC = {
  prism: '35 Queries per month to The Prism.',
};

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

      // ── New or updated subscription ──────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer;
        const subscriptionId = sub.id;
        const status = sub.status === 'active' ? 'active' : 'inactive';
        const amount = sub.items?.data?.[0]?.price?.unit_amount || 0;
        const config = TIER_CONFIG[amount];
        if (!config) throw new Error(`Unrecognized Prism subscription amount: ${amount}`);
        const email = await getCustomerEmail(customerId);
        const periodStart = new Date(sub.current_period_start * 1000).toISOString();
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

        await applyPrismSubscription(email, status, periodStart, periodEnd);

        if (event.type === 'customer.subscription.created') {
          await upsertSubscriber(email, customerId, subscriptionId, config.tier, status);

          if (email && status === 'active') {
            const tierName = TIER_DISPLAY[config.tier] || 'Refraction';
            const tierDesc = TIER_DESC[config.tier] || '';
            try {
              await sendEmail(
                email,
                `Welcome to The Prism — ${tierName}`,
                emailWrapper(`
                  <p style="font-size:18px; line-height:1.8; color:#d8d4e8;">Your <strong style="color:#e8d5a0;">${tierName}</strong> subscription is active.</p>
                  <p style="font-size:16px; line-height:1.8; color:#7a7890;">${tierDesc} The Prism surfaces the relational architecture already present in the text.</p>
                  <div style="text-align:center; margin:40px 0;">
                    <a href="https://quantumtheology.app/qt-gateway.html" style="font-family:monospace; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#e8d5a0; text-decoration:none; border:1px solid #7a6230; padding:14px 32px;">Enter the Prism</a>
                  </div>
                  <p style="font-size:13px; color:#3a384a; text-align:center;">Manage your subscription at <a href="https://billing.stripe.com" style="color:#7a6230;">billing.stripe.com</a></p>
                `)
              );
            } catch (emailErr) {
              console.error('Welcome email failed:', emailErr.message);
            }
          }
        } else {
          // Updated — sync tier and status
          await updateSubscription(subscriptionId, config.tier, config.limit, status);
        }
        break;
      }

      // ── Subscription cancelled ───────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await updateSubscriberStatus(sub.id, 'inactive');
        const email = await getCustomerEmail(sub.customer);
        await applyPrismSubscription(
          email,
          'canceled',
          new Date(sub.current_period_start * 1000).toISOString(),
          new Date(sub.current_period_end * 1000).toISOString(),
        );
        if (email) {
          try {
            await sendEmail(
              email,
              'Your Prism Subscription Has Been Cancelled',
              emailWrapper(`
                <p style="font-size:18px; line-height:1.8; color:#d8d4e8;">Your subscription has been cancelled.</p>
                <p style="font-size:16px; line-height:1.8; color:#7a7890;">We hope The Prism served you well. Explorer access includes one successful Query per rolling 24 hours. If you ever want to return, your subscription is one step away.</p>
                <div style="text-align:center; margin:40px 0;">
                  <a href="https://quantumtheology.app/#interpreter" style="font-family:monospace; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#e8d5a0; text-decoration:none; border:1px solid #7a6230; padding:14px 32px;">Resubscribe</a>
                </div>
              `)
            );
          } catch (emailErr) {
            console.error('Cancellation email failed:', emailErr.message);
          }
        }
        break;
      }

      // ── Successful invoice — reset monthly query count ───────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const email = invoice.customer_email || (invoice.customer ? await getCustomerEmail(invoice.customer) : null);
          const period = invoice.lines?.data?.[0]?.period;
          if (email && period?.start && period?.end) {
            await applyPrismSubscription(
              email,
              'active',
              new Date(period.start * 1000).toISOString(),
              new Date(period.end * 1000).toISOString(),
            );
          }
        }
        break;
      }

      // ── Failed invoice ───────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const email = await getCustomerEmail(invoice.customer);
        if (email) {
          try {
            await sendEmail(
              email,
              'Action Required — Payment Issue with Your Prism Subscription',
              emailWrapper(`
                <p style="font-size:18px; line-height:1.8; color:#d8d4e8;">There was an issue processing your subscription payment.</p>
                <p style="font-size:16px; line-height:1.8; color:#7a7890;">Stripe will retry the charge automatically. To avoid any interruption to your Prism access, please update your payment method at your earliest convenience.</p>
                <div style="text-align:center; margin:40px 0;">
                  <a href="https://billing.stripe.com" style="font-family:monospace; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#e8d5a0; text-decoration:none; border:1px solid #7a6230; padding:14px 32px;">Update Payment Method</a>
                </div>
              `)
            );
          } catch (emailErr) {
            console.error('Payment failed email error:', emailErr.message);
          }
        }
        break;
      }

      // ── Signal Sessions — one-time credit purchase ───────────────
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const amount = pi.amount;

        if (SIGNAL_AMOUNTS.has(amount)) {
          const credits = queryBankCreditsForAmount(amount);
          const email = pi.receipt_email || (pi.customer ? await getCustomerEmail(pi.customer) : null);

          if (email && credits) {
            await creditQueryBank(email, credits, event.id);
            try {
              await sendEmail(
                email,
                `Your Signal Sessions — ${credits} Queries Added`,
                emailWrapper(`
                  <p style="font-size:18px; line-height:1.8; color:#d8d4e8;"><strong style="color:#e8d5a0;">${credits} queries</strong> have been added to your Prism account.</p>
                  <p style="font-size:16px; line-height:1.8; color:#7a7890;">Your Signal Sessions never expire and stack with any existing credits. Use them at your own pace.</p>
                  <div style="text-align:center; margin:40px 0;">
                    <a href="https://quantumtheology.app/qt-gateway.html?flow=setpassword&email=${encodeURIComponent(email)}" style="font-family:monospace; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#e8d5a0; text-decoration:none; border:1px solid #7a6230; padding:14px 32px;">Enter the Prism</a>
                  </div>
                `)
              );
            } catch (emailErr) {
              console.error('Signal Sessions email failed:', emailErr.message);
            }
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        const email = pi.receipt_email || (pi.customer ? await getCustomerEmail(pi.customer) : null);
        if (email) {
          try {
            await sendEmail(
              email,
              'Action Required — Payment Failed',
              emailWrapper(`
                <p style="font-size:18px; line-height:1.8; color:#d8d4e8;">Your payment could not be processed.</p>
                <p style="font-size:16px; line-height:1.8; color:#7a7890;">Please update your payment method to restore full Prism access.</p>
                <div style="text-align:center; margin:40px 0;">
                  <a href="https://billing.stripe.com" style="font-family:monospace; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#e8d5a0; text-decoration:none; border:1px solid #7a6230; padding:14px 32px;">Update Payment Method</a>
                </div>
              `)
            );
          } catch (emailErr) {
            console.error('payment_intent.payment_failed email error:', emailErr.message);
          }
        }
        break;
      }

      case 'payment_intent.requires_action': {
        const pi = event.data.object;
        const email = pi.receipt_email || (pi.customer ? await getCustomerEmail(pi.customer) : null);
        if (email) {
          try {
            await sendEmail(
              email,
              'Action Required — Complete Your Payment',
              emailWrapper(`
                <p style="font-size:18px; line-height:1.8; color:#d8d4e8;">Your payment requires additional verification.</p>
                <p style="font-size:16px; line-height:1.8; color:#7a7890;">Your bank may be requesting authentication. Please complete the step to activate your Prism access.</p>
                <div style="text-align:center; margin:40px 0;">
                  <a href="https://billing.stripe.com" style="font-family:monospace; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#e8d5a0; text-decoration:none; border:1px solid #7a6230; padding:14px 32px;">Complete Payment</a>
                </div>
              `)
            );
          } catch (emailErr) {
            console.error('payment_intent.requires_action email error:', emailErr.message);
          }
        }
        break;
      }

      case 'payment_intent.canceled': {
        console.log('PaymentIntent canceled:', event.data.object.id);
        break;
      }

    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    return res.status(500).json({ error: 'Handler error' });
  }

  return res.status(200).json({ received: true });
}
