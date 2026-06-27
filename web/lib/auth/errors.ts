/**
 * Translates raw Supabase auth errors into specific, human-friendly messages.
 *
 * Supabase returns terse strings like "Invalid login credentials" for several
 * different situations. The UI wants to tell the user *exactly* what went
 * wrong — wrong password vs. unknown account vs. already registered — so this
 * maps the known cases to clear copy. Anything unrecognised falls back to the
 * original message rather than a generic "something went wrong".
 */

export type AuthAction = 'signin' | 'signup';

export function describeAuthError(message: string | undefined, action: AuthAction): string {
  if (!message) return 'Something went wrong. Please try again.';

  const text = message.toLowerCase();

  // --- Sign up specific -----------------------------------------------------
  if (text.includes('already registered') || text.includes('already been registered') || text.includes('user already exists')) {
    return 'That email is already registered. Try signing in instead.';
  }

  // --- Sign in specific -----------------------------------------------------
  if (text.includes('invalid login credentials')) {
    // Supabase intentionally does not reveal which field is wrong (anti-enumeration).
    // We surface a helpful, honest message that covers both cases.
    return 'Incorrect email or password. Double-check and try again — or sign up if you do not have an account yet.';
  }

  if (text.includes('email not confirmed')) {
    return 'Please confirm your email first. Check your inbox for the verification link.';
  }

  // --- Validation -----------------------------------------------------------
  if (text.includes('password should be at least')) {
    return 'Your password is too short. Use at least 6 characters.';
  }

  if (text.includes('unable to validate email') || text.includes('invalid email')) {
    return 'That email address does not look valid.';
  }

  if (text.includes('rate limit') || text.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (text.includes('signups not allowed') || text.includes('signup is disabled')) {
    return 'New sign-ups are currently disabled for this project.';
  }

  // --- Network --------------------------------------------------------------
  if (text.includes('failed to fetch') || text.includes('network')) {
    return 'Cannot reach the server. Check your internet connection and try again.';
  }

  // Fall back to the original (already capitalised) message.
  return action === 'signup'
    ? `Could not create your account: ${message}`
    : `Could not sign you in: ${message}`;
}
