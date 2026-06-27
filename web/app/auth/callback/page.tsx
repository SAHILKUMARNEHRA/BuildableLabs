'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * OAuth / email-confirmation landing page.
 *
 * Supabase (with `detectSessionInUrl` + PKCE) automatically exchanges the
 * `?code=` in the URL for a session when the client initialises. We just wait
 * for that session to appear, then forward the user into the app. If anything
 * goes wrong we send them back to sign in with a clear message.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Finishing sign-in…');

  useEffect(() => {
    const supabase = getSupabaseClient();
    let settled = false;

    async function finish() {
      // Give Supabase a moment to process the code in the URL, retrying briefly.
      for (let attempt = 0; attempt < 10 && !settled; attempt++) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          settled = true;
          router.replace('/documents');
          return;
        }
        await new Promise((r) => setTimeout(r, 300));
      }

      if (!settled) {
        setMessage('That sign-in link did not work. Redirecting you to sign in…');
        setTimeout(() => router.replace('/login'), 1500);
      }
    }

    // Also react if the session arrives via the auth listener first.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !settled) {
        settled = true;
        router.replace('/documents');
      }
    });

    finish();
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-400 border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">{message}</p>
      </div>
    </main>
  );
}
