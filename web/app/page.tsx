'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';

/**
 * Entry route. Sends signed-in users to their documents and everyone else to
 * the sign-in page. Shows a calm loading state while the session resolves so
 * there is no flash of the wrong screen.
 */
export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/documents' : '/login');
  }, [user, loading, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-400 border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">Loading your workspace…</p>
      </div>
    </main>
  );
}
