'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthContextValue {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toAppUser(user: User | null): AppUser | null {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const displayName =
    meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'Anonymous');
  return { id: user.id, email: user.email || '', displayName };
}

/**
 * Provides the current auth session to the whole app and keeps it in sync via
 * Supabase's `onAuthStateChange`. Wrapping the tree once means components never
 * have to re-fetch the session or worry about it going stale after a refresh.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await getSupabaseClient().auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ user: toAppUser(session?.user ?? null), session, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>.');
  return ctx;
}
