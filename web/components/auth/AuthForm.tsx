'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { describeAuthError, type AuthAction } from '@/lib/auth/errors';
import { useToast } from '@/components/ui/Toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GoogleButton } from './GoogleButton';

interface AuthFormProps {
  mode: AuthAction;
}

/**
 * Email + password auth form, shared by the sign-in and sign-up pages.
 *
 * The whole point of this component is *specific* feedback: every failure path
 * — wrong password, unregistered email, already-registered email, weak
 * password, unconfirmed email — maps to a clear message (see lib/auth/errors)
 * shown both inline and as a toast.
 */
export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';

  function validate(): string | null {
    if (!email.trim()) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'That email address does not look valid.';
    if (!password) return 'Please enter your password.';
    if (isSignup && password.length < 6) return 'Choose a password with at least 6 characters.';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });

        if (error) {
          const message = describeAuthError(error.message, 'signup');
          setError(message);
          toast(message, 'error');
          return;
        }

        // If email confirmation is enabled, Supabase returns a user but no session.
        if (data.user && !data.session) {
          toast('Account created! Check your inbox to confirm your email.', 'success');
          router.push('/login');
          return;
        }

        toast('Welcome aboard! 🎉', 'success');
        router.push('/documents');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          const message = describeAuthError(error.message, 'signin');
          setError(message);
          toast(message, 'error');
          return;
        }

        toast('Signed in. Welcome back! 👋', 'success');
        router.push('/documents');
      }
    } catch {
      const message = 'Cannot reach the authentication server. Check your connection.';
      setError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard strong className="w-full max-w-md animate-fade-up p-8 sm:p-10">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl font-black lowercase text-white shadow-lg shadow-indigo-500/30">
          b
        </div>
        <h1 className="text-2xl font-bold text-slate-800">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {isSignup ? 'Start writing together in seconds.' : 'Sign in to your collaborative workspace.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
        />

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200/70 bg-rose-50/70 px-3.5 py-2.5 text-sm text-rose-600">
            <span className="mt-0.5 font-bold">!</span>
            <span>{error}</span>
          </div>
        )}

        <GlassButton type="submit" loading={loading} className="w-full">
          {isSignup ? 'Create account' : 'Sign in'}
        </GlassButton>
      </form>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-slate-300/60" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
        <span className="h-px flex-1 bg-slate-300/60" />
      </div>

      <GoogleButton />

      <p className="mt-7 text-center text-sm text-slate-500">
        {isSignup ? 'Already have an account? ' : "Don't have an account? "}
        <Link
          href={isSignup ? '/login' : '/signup'}
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          {isSignup ? 'Sign in' : 'Sign up'}
        </Link>
      </p>
    </GlassCard>
  );
}

interface FieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

function Field({ label, type, value, onChange, placeholder, autoComplete }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-white/70 bg-white/60 px-4 py-2.5 text-slate-800 placeholder:text-slate-400
          shadow-inner outline-none backdrop-blur transition focus:border-indigo-300 focus:bg-white/80 focus:ring-2 focus:ring-indigo-300/50"
      />
    </label>
  );
}
