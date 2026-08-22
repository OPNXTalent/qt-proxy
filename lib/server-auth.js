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
