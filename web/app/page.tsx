'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { GlassCard } from '@/components/ui/GlassCard';

/**
 * Landing page. Signed-in users are forwarded straight to their documents;
 * everyone else gets a hero that explains the product and routes to sign up /
 * sign in. Showing a real landing (instead of an instant redirect) makes a
 * much better first impression for anyone opening the app cold.
 */
export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/documents');
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-400 border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-3xl animate-fade-up text-center">
        <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-4xl font-black lowercase text-white shadow-lg shadow-indigo-500/30">
          b
        </div>

        <h1 className="text-balance text-5xl font-bold tracking-tight text-slate-800 sm:text-6xl">
          Write together,
          <span className="bg-gradient-to-br from-indigo-500 to-violet-600 bg-clip-text text-transparent">
            {' '}
            in real time.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-500">
          A collaborative document editor where every keystroke syncs instantly, cursors move live,
          and your work is always saved — even offline.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="glass-sheen rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-500/50 active:scale-[0.98]"
          >
            Get started — it’s free
          </Link>
          <Link
            href="/login"
            className="glass glass-sheen rounded-full px-7 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white/70 active:scale-[0.98]"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <GlassCard key={f.title} className="p-5 text-left">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 text-xl">
                {f.icon}
              </div>
              <h3 className="font-semibold text-slate-800">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{f.body}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </main>
  );
}

const FEATURES = [
  { icon: '⚡️', title: 'Instant sync', body: 'Edits appear for everyone the moment you type — no refresh, no lag.' },
  { icon: '👥', title: 'Live presence', body: 'See who’s here and follow their coloured cursors as they write.' },
  { icon: '📡', title: 'Works offline', body: 'Keep writing without a connection; changes merge when you’re back.' },
];
