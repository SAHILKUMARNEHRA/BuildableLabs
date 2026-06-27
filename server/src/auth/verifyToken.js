import { supabase } from '../config/supabase.js';

/**
 * Verifies a Supabase access token and returns the authenticated user.
 *
 * Returns `null` for any invalid / expired / missing token rather than
 * throwing, so callers can decide how to react (reject a socket, send a 401,
 * etc.) without a try/catch everywhere.
 */
export async function verifyToken(accessToken) {
  if (!accessToken) return null;

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) return null;

  return data.user;
}

/**
 * Express middleware variant. Expects an `Authorization: Bearer <token>`
 * header and attaches the user to `req.user`.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  const user = await verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'unauthorized', message: 'You must be signed in.' });
  }

  req.user = user;
  next();
}
