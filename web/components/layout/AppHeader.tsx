'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { colorForUser, initialsFor } from '@/lib/collab/colors';
import { useToast } from '@/components/ui/Toast';
import type { ReactNode } from 'react';

/**
 * Top navigation bar shared across authenticated pages. Shows the brand, an
 * optional center slot (e.g. the document title), and the user's avatar with a
 * sign-out action.
 */
export function AppHeader({ center }: { center?: ReactNode }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  async function handleSignOut() {
    await signOut();
    toast('Signed out.', 'info');
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-30 px-4 pt-4">
      <div className="glass mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl px-4 py-2.5 sm:px-5">
        <Link href="/documents" className="flex items-center gap-2 font-bold text-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-black lowercase text-white shadow-sm">
            b
          </span>
          <span className="hidden sm:inline">Fluid</span>
        </Link>

        <div className="min-w-0 flex-1 px-2">{center}</div>

        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-700">{user.displayName}</p>
              <p className="text-xs leading-tight text-slate-400">{user.email}</p>
            </div>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow"
              style={{ background: colorForUser(user.id) }}
              title={user.displayName}
            >
              {initialsFor(user.displayName)}
            </span>
            <button
              onClick={handleSignOut}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-white/50 hover:text-slate-700"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
