// Explicit preview isolation; production configuration is unchanged.
export const PRISM_PRODUCTION_SUPABASE_REF = 'fgngixbhpilefmyyeldr';

function keyClaims(key) {
  try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')); }
  catch { return null; }
}

export function assertPreviewDatabaseIsolation(env = process.env) {
  if (env.VERCEL_ENV !== 'preview') return;
  const ref = env.PRISM_PREVIEW_SUPABASE_REF;
  if (!/^[a-z]{20}$/.test(ref || '') || ref === PRISM_PRODUCTION_SUPABASE_REF
    || env.SUPABASE_URL !== `https://${ref}.supabase.co`) {
    throw new Error('PRISM_PREVIEW_DATABASE_NOT_ISOLATED');
  }
  for (const [name, role, prefix] of [
    ['SUPABASE_ANON_KEY', 'anon', 'sb_publishable_'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'service_role', 'sb_secret_'],
  ]) {
    const key = env[name] || '';
    // New opaque keys must be taken from the branch project together with URL.
    // Legacy JWT ref/role can additionally detect accidental key reuse.
    if (key.startsWith(prefix) && key.length > prefix.length + 20) continue;
    const claims = keyClaims(key);
    if (claims?.ref !== ref || claims?.role !== role) {
      throw new Error('PRISM_PREVIEW_DATABASE_KEY_MISMATCH');
    }
  }
}

export function publicClientConfig(env = process.env) {
  assertPreviewDatabaseIsolation(env);
  const url = env.SUPABASE_URL, key = env.SUPABASE_ANON_KEY;
  if (!/^https:\/\/[a-z]{20}\.supabase\.co$/.test(url || '')) {
    throw new Error('PRISM_PUBLIC_DATABASE_CONFIGURATION_INVALID');
  }
  const ref = new URL(url).hostname.split('.')[0];
  const claims = keyClaims(key || '');
  if (!(key?.startsWith('sb_publishable_') && key.length > 35)
    && !(claims?.role === 'anon' && claims?.ref === ref)) {
    throw new Error('PRISM_PUBLIC_DATABASE_KEY_INVALID');
  }
  // Allowlist only. Never serialize process.env or the service role key.
  return { supabaseUrl: url, supabaseAnonKey: key };
}
