import { Router } from 'express';
import { supabase } from '../config/supabase.js';

/**
 * Public auth helpers.
 *
 * Sign-up goes through the server (using the service role) so we can create the
 * account already e-mail-confirmed. This sidesteps Supabase's built-in
 * confirmation e-mail entirely — which both removes the "confirm your email"
 * step and avoids the low hourly e-mail rate limit on the free tier. The
 * browser then signs in normally with the password.
 */
export const authRouter = Router();

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** POST /api/auth/signup -> create a confirmed account. */
authRouter.post('/signup', async (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';
  const displayName = (req.body?.displayName || '').trim();

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'invalid_email', message: 'That email address does not look valid.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'weak_password', message: 'Choose a password with at least 6 characters.' });
  }

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: displayName ? { full_name: displayName } : undefined,
  });

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('already') || msg.includes('exists') || error.status === 422) {
      return res
        .status(409)
        .json({ error: 'already_registered', message: 'That email is already registered. Try signing in instead.' });
    }
    return res.status(500).json({ error: 'signup_failed', message: error.message || 'Could not create your account.' });
  }

  res.status(201).json({ created: true });
});
