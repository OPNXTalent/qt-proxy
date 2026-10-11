const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function extractBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') return null;
  const match = authorizationHeader.match(/^Bearer ([^\s]+)$/i);
  return match?.[1] || null;
}

export async function verifySupabaseIdentity({
  authorizationHeader,
  supabaseUrl,
  supabaseAnonKey,
  fetchImpl = fetch,
}) {
  const token = extractBearerToken(authorizationHeader);
  if (!token) return { provided: Boolean(authorizationHeader), identity: null };
  if (!supabaseUrl || !supabaseAnonKey) {
    return { provided: true, identity: null, unavailable: true, error: 'auth_configuration_unavailable' };
  }

  try {
    const response = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      return { provided: true, identity: null, error: 'invalid_authentication' };
    }
    const user = await response.json();
    if (!UUID_PATTERN.test(user?.id || '') || typeof user?.email !== 'string') {
      return { provided: true, identity: null, error: 'invalid_authentication' };
    }
    return {
      provided: true,
      identity: {
        userId: user.id.toLowerCase(),
        email: user.email.trim().toLowerCase(),
      },
    };
  } catch {
    return { provided: true, identity: null, unavailable: true, error: 'identity_verification_unavailable' };
  }
}

export function getPreviewTestEntitlement({
  userId,
  deploymentEnvironment = process.env.VERCEL_ENV,
  configuredUserIds = process.env.PREVIEW_TEST_USER_IDS,
  configuredAllowance = process.env.PREVIEW_TEST_QUERY_ALLOWANCE,
}) {
  if (deploymentEnvironment !== 'preview') return null;
  if (!configuredUserIds || !configuredAllowance || !UUID_PATTERN.test(userId || '')) return null;

  const ids = configuredUserIds.split(',').map(value => value.trim().toLowerCase());
  if (
    ids.length === 0
    || ids.some(value => !UUID_PATTERN.test(value))
    || new Set(ids).size !== ids.length
  ) {
    return null;
  }

  const allowance = Number(configuredAllowance);
  if (!Number.isSafeInteger(allowance) || allowance < 1 || allowance > 200) return null;
  if (!ids.includes(userId.toLowerCase())) return null;
  return { allowance };
}


// Shared, server-side security admission for billable AI endpoints.
// Only the service role can execute the atomic rate/lease RPCs.
export async function admitPrismAiRequest({ req, route, principal, maxPerMinute, maxParallel = 2, leaseSeconds = 300 }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !principal) throw new Error('AI admission not configured');
  const { createHmac } = await import('node:crypto');
  const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'unknown')
    .split(',')[0].trim().slice(0, 100);
  const network = createHmac('sha256',key).update(ip).digest('hex').slice(0,32);
  const headers = { apikey:key, Authorization:'Bearer '+key, 'Content-Type':'application/json' };
  async function rpc(name,body) {
    const response = await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(body)});
    if (!response.ok) throw new Error('AI admission RPC '+name+' failed: '+response.status);
    return response.json();
  }
  // Both account and network checks are necessary: guest cookie rotation must
  // not reset network limits, while shared networks must not share an account budget.
  const scopes = [
    ['principal:'+principal, maxPerMinute],
    ['network:'+network, maxPerMinute * 8],
  ];
  for (const [scope,limit] of scopes) {
    const ok = await rpc('prism_check_api_rate',{
      p_route:route,p_scope:scope,p_window_seconds:60,p_max_requests:limit
    });
    if (!ok) return {allowed:false,status:429,reason:'Too many requests. Please wait a minute and try again.'};
  }
  const leaseId = await rpc('prism_claim_api_lease',{
    p_route:route,p_scope:'principal:'+principal,p_max_parallel:maxParallel,p_lease_seconds:leaseSeconds
  });
  if (!leaseId) return {allowed:false,status:429,reason:'An earlier request is still processing. Please wait for it to finish.'};
  let released=false;
  const release=()=>{
    if (released) return;
    released=true;
    rpc('prism_release_api_lease',{p_lease_id:leaseId})
      .catch(err=>console.error('[ai-admission] lease release failed',err.message));
  };
  return {allowed:true,release};
}
