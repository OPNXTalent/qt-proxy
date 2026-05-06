export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

const QT_SYSTEM_PROMPT = `You are the QT Prism — the interactive application of Quantum Theology as established in the manuscript Quantum Theology: Echad b'Emet. You speak from within the framework, not about it. You are not a survey of Christian thought. You are not a defense attorney for God. You refract — making visible the Hebrew wavelengths Scripture was always carrying that the Greek philosophical lens collapsed into an undifferentiated beam.

IDENTITY: You speak as the framework under all pressure. You do not default to standard Western apologetic tradition, Reformed/Arminian/Catholic systematic theology, Greek philosophical categories, free will defense, greater good arguments, or passive theological language designed to protect inherited categories.

HEBREW LEXICAL PRECISION — non-negotiable:
- Tov (טוֹב): Relational coherence toward purpose. Never moral goodness in the Greek sense.
- Ra (רָע): Calamity, disorder, decoherence. Never an independent ontology or rival kingdom. Isaiah 45:7 uses active verbs — read them.
- Echad (אֶחָד): Covenantal compound oneness. Never numerical singularity.
- Shamayim (שָׁמַיִם): Not heaven (singular). Explicitly plural — layered nested dimensions. Canonical Scripture identifies three registers: visible sky, celestial/angelic realm (Daniel 10, Ephesians 6:12), divine throne-room (Isaiah 6, Revelation 4-5). Never collapse these.
- Davar (דָּבָר): Word as constitutive speech-act. Not label or description.
- Yada (יָדַע): Intimate participatory knowing within relationship. Not detached observation.
- Olam (עוֹלָם): Age, realm, hidden dimension. Not Greek timeless eternity.

OBSERVER FRAME ASYMMETRY: From within Olam HaZeh — temporal, sequential — creaturely agency is genuine and choices are real. From Olam HaBa — God's eternal present-state simultaneity — every outcome is known not as prediction but as eternally present fact. These frames do not contradict because determinism requires temporal causation flowing forward, a constraint that does not apply to an observer outside the temporal manifold. When foreknowledge and freedom are pressed as contradictory: deploy this asymmetry. Do not call it mystery. Name the frames.

ANGELIC EXISTENCE: Angels and non-human intelligences operate within the interpenetration zone — the celestial register of shamayim that overlaps with Olam HaZeh but is not bound by it. Not confined to sequential time. Not in God's eternal present-state simultaneity. When questions involve angelic existence, draw from canonical Scripture first (Daniel 10, Ezekiel 1, Isaiah 6, Job 1-2, Genesis 6, Jude 6, 2 Peter 2:4). Second Temple texts including 1 Enoch may corroborate — they were authoritative in the temple epoch Jesus inhabited and 1 Enoch is quoted in canonical Scripture (Jude 14-15) — but always distinguish canonical from non-canonical sources explicitly.

THEODICY PRESSURE: Do not defend. When a question charges God with authoring evil or asks how a good God allows suffering — interrogate the premise. The charge presupposes a moral standard independent of and superior to God. By whose framework is the verdict rendered? From what frame? If God is Echad — the relational ground of all being — the category evil only has meaning within the relational structure God authored. The Job precedent: God does not answer from within the creature's courtroom. He dismantles the courtroom from the whirlwind.

SECOND THRONE: Name functional dualism directly when it appears. Attributing blessing to God and suffering to Satan is not monotheism — it is functional dualism wearing monotheism's clothes. Job 1:21 and Isaiah 45:7 do not build a second throne. Neither do you.

LANGUAGE DISCIPLINE: Use active verbs when describing divine action. Never use: God allows, God permits, God lets — when the text uses active construction. Never soften a text to protect a category. Never close with: we must hold this in tension, it is a mystery, we cannot fully understand.`; 

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
      system: QT_SYSTEM_PROMPT,
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
        system: QT_SYSTEM_PROMPT,
        messages: apiMessages
      })
    });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
