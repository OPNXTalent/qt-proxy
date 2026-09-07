import crypto from 'node:crypto';

const GUEST_COOKIE = 'prism_guest';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function serviceHeaders(serviceRoleKey, prefer = null) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

export function parseCookies(header = '') {
  return Object.fromEntries(String(header).split(';').map(part => {
    const index = part.indexOf('=');
    if (index < 0) return ['', ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

export function guestCookieHeader(credential) {
  return `${GUEST_COOKIE}=${encodeURIComponent(credential)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export function clearGuestCookieHeader() {
  return `${GUEST_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function hashSecret(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export async function issueGuestIdentity({ supabaseUrl, serviceRoleKey, fetchImpl = fetch }) {
  const guestId = crypto.randomUUID();
  const secret = crypto.randomBytes(32).toString('base64url');
  const response = await fetchImpl(`${supabaseUrl}/rest/v1/prism_guests`, {
    method: 'POST',
    headers: serviceHeaders(serviceRoleKey, 'return=minimal'),
    body: JSON.stringify({ guest_id: guestId, secret_hash: hashSecret(secret) }),
  });
  if (!response.ok) throw new Error(`GUEST_IDENTITY_CREATE_FAILED:${response.status}`);
  return { guestId, credential: `${guestId}.${secret}` };
}

export async function verifyGuestIdentity({ cookieHeader, supabaseUrl, serviceRoleKey, fetchImpl = fetch, allowClaimed = false }) {
  const credential = parseCookies(cookieHeader)[GUEST_COOKIE];
  if (!credential) return null;
  const separator = credential.indexOf('.');
  if (separator < 1) return null;
  const guestId = credential.slice(0, separator);
  const secret = credential.slice(separator + 1);
  if (!UUID_PATTERN.test(guestId) || secret.length < 32) return null;
  const response = await fetchImpl(
    `${supabaseUrl}/rest/v1/prism_guests?guest_id=eq.${encodeURIComponent(guestId)}&select=guest_id,secret_hash,claimed_by&limit=1`,
    { headers: serviceHeaders(serviceRoleKey) },
  );
  if (!response.ok) return null;
  const row = (await response.json())?.[0];
  if (!row || (row.claimed_by && !allowClaimed)) return null;
  const expected = Buffer.from(row.secret_hash, 'hex');
  const actual = Buffer.from(hashSecret(secret), 'hex');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  return { guestId: row.guest_id, credential, claimedBy: row.claimed_by || null };
}

export async function getOrIssueGuestIdentity(options) {
  const existing = await verifyGuestIdentity(options);
  if (existing) return { ...existing, issued: false };
  return { ...(await issueGuestIdentity(options)), issued: true };
}

export async function claimGuestIdentity({ guestId, userId, supabaseUrl, serviceRoleKey, fetchImpl = fetch }) {
  const response = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/claim_prism_guest`, {
    method: 'POST',
    headers: serviceHeaders(serviceRoleKey),
    body: JSON.stringify({ p_guest_id: guestId, p_user_id: userId }),
  });
  if (!response.ok) throw new Error(`GUEST_IDENTITY_CLAIM_FAILED:${response.status}`);
  return response.json();
}
