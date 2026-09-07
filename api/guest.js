import {
  claimGuestIdentity,
  clearGuestCookieHeader,
  getOrIssueGuestIdentity,
  guestCookieHeader,
  verifyGuestIdentity,
} from '../lib/guest-identity.js';
import { verifySupabaseIdentity } from '../lib/server-auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function noStore(res) {
  res.setHeader('Cache-Control', 'private, no-store');
}

export default async function handler(req, res) {
  noStore(res);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'guest_identity_unavailable' });
  }
  if (req.method === 'POST' && req.body?.action === 'claim') {
    const auth = await verifySupabaseIdentity({
      authorizationHeader: req.headers.authorization,
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
    });
    if (!auth.identity) return res.status(401).json({ error: 'verified_authentication_required' });
    const guest = await verifyGuestIdentity({
      cookieHeader: req.headers.cookie,
      supabaseUrl: SUPABASE_URL,
      serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
      allowClaimed: true,
    });
    if (!guest) return res.status(400).json({ error: 'guest_credential_required' });
    try {
      const result = await claimGuestIdentity({
        guestId: guest.guestId,
        userId: auth.identity.userId,
        supabaseUrl: SUPABASE_URL,
        serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
      });
      res.setHeader('Set-Cookie', clearGuestCookieHeader());
      return res.status(200).json({ claimed: true, alreadyClaimed: Boolean(result?.[0]?.already_claimed) });
    } catch (error) {
      return res.status(409).json({ error: String(error?.message || error) });
    }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const guest = await getOrIssueGuestIdentity({
      cookieHeader: req.headers.cookie,
      supabaseUrl: SUPABASE_URL,
      serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    });
    if (guest.issued) res.setHeader('Set-Cookie', guestCookieHeader(guest.credential));
    return res.status(200).json({ guestId: guest.guestId });
  } catch (error) {
    return res.status(503).json({ error: String(error?.message || error) });
  }
}
