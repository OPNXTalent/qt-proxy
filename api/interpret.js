export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const QUERY_LIMIT = 3;
const WINDOW_HOURS = 24;

// Tier query limits per month (approximate daily = monthly/30)
const TIER_LIMITS = {
  scholar: 150,
  theologian: 350,
  companion: 500,
};

async function getSubscriber(email) {
  if (!email) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const data = await res.json();
  return data?.[0] || null;
}
async function getCodeRedemption(email) {
  if (!email) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/code_redemptions?email=eq.${encodeURIComponent(email)}&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const data = await res.json();
  if (!data || data.length === 0) return null;
  const redemption = data[0];
  const expires = new Date(redemption.access_expires_at);
  if (expires > new Date()) return redemption;
  return null;
}
async function getQueryLog(ip) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/query_log?ip_address=eq.${encodeURIComponent(ip)}&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const data = await res.json();
  return data?.[0] || null;
}

async function insertQueryLog(ip) {
  await fetch(`${SUPABASE_URL}/rest/v1/query_log`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ ip_address: ip, query_count: 1, first_query_at: new Date().toISOString() })
  });
}

async function incrementQueryLog(ip, currentCount) {
  await fetch(`${SUPABASE_URL}/rest/v1/query_log?ip_address=eq.${encodeURIComponent(ip)}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query_count: currentCount + 1 })
  });
}

async function resetQueryLog(ip) {
  await fetch(`${SUPABASE_URL}/rest/v1/query_log?ip_address=eq.${encodeURIComponent(ip)}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query_count: 1, first_query_at: new Date().toISOString() })
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

  // Parse body first so we can check email
  let prompt, messages, userEmail;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    prompt = body?.prompt;
    messages = body?.messages;
    userEmail = body?.email || null;
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // Check if subscriber
  try {
    if (userEmail) {
      const subscriber = await getSubscriber(userEmail);
      const redemption = await getCodeRedemption(userEmail);
      if ((subscriber && subscriber.status === 'active') || redemption) {
  // Active subscriber or valid code — skip rate limit, go straight to API
  const apiMessages = messages || (prompt ? [{ role: 'user', content: prompt }] : null);
  if (!apiMessages || apiMessages.length === 0) {
    return res.status(400).json({ error: 'No messages provided' });
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2500,
      messages: apiMessages
    })
  });
  const data = await response.json();
  const tier = subscriber?.tier || 'trial';
  return res.status(200).json({ ...data, subscriber: true, tier });
}
    }
  } catch (err) {
    console.error('Subscriber check failed:', err.message);
  }

  // Not a subscriber — apply IP rate limit
  try {
    const log = await getQueryLog(ip);
    if (log) {
      const firstQuery = new Date(log.first_query_at);
      const hoursSinceFirst = (Date.now() - firstQuery.getTime()) / (1000 * 60 * 60);
      if (hoursSinceFirst >= WINDOW_HOURS) {
        await resetQueryLog(ip);
      } else if (log.query_count >= QUERY_LIMIT) {
        const hoursRemaining = Math.ceil(WINDOW_HOURS - hoursSinceFirst);
        return res.status(429).json({
          error: 'Query limit reached',
          message: `You've used all ${QUERY_LIMIT} free queries. Access resets in ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}.`,
          hoursRemaining
        });
      } else {
        await incrementQueryLog(ip, log.query_count);
      }
    } else {
      await insertQueryLog(ip);
    }
  } catch (err) {
    console.error('Rate limit check failed:', err.message);
  }

  const apiMessages = messages || (prompt ? [{ role: 'user', content: prompt }] : null);
  if (!apiMessages || apiMessages.length === 0) {
    return res.status(400).json({ error: 'No messages provided' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2500,
        messages: apiMessages
      })
    });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
