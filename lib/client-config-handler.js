function publicClientConfig(env = process.env) {
 const url=env.SUPABASE_URL, key=env.SUPABASE_ANON_KEY;
 if (!/^https:\/\/[a-z]{20}\.supabase\.co$/.test(url || '')) throw Error('INVALID_PUBLIC_CONFIG');
 let claims; try { claims=JSON.parse(Buffer.from((key||'').split('.')[1]||'', 'base64url').toString()); } catch {}
 if (!(key?.startsWith('sb_publishable_') && key.length>35) && !(claims?.role==='anon' && claims?.ref===new URL(url).hostname.split('.')[0])) throw Error('INVALID_PUBLIC_KEY');
 return {supabaseUrl:url,supabaseAnonKey:key};
}

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  try {
    // Escape script-sensitive characters even though the schema is restrictive.
    const config = JSON.stringify(publicClientConfig()).replace(/</g, '\\u003c');
    return res.status(200).end(`window.PRISM_PUBLIC_CONFIG = Object.freeze(${config});`);
  } catch {
    return res.status(503).end('window.PRISM_PUBLIC_CONFIG = null;');
  }
}
