'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { api, ApiError, type DocumentMeta } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { DashboardActions } from '@/components/documents/DashboardActions';

/**
 * The dashboard: a grid of every document the signed-in user can open, plus
 * the controls to create or join one. Guards itself — unauthenticated visitors
 * are bounced to /login.
 */
export default function DocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { documents } = await api.listDocuments();
      setDocuments(documents);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your documents.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Route guard + initial load.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    load();
  }, [user, authLoading, router, load]);

  return (
    <div className="min-h-screen pb-20">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Your documents</h1>
            <p className="mt-1 text-slate-500">Create, open, and collaborate in real time.</p>
          </div>
          <DashboardActions onChange={load} />
        </div>

        {loading ? (
          <GridSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : documents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} ownerId={user?.id || ''} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass h-36 animate-pulse rounded-2xl opacity-60" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass mt-4 flex flex-col items-center justify-center rounded-3xl py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400/80 to-violet-500/80 text-3xl text-white shadow-lg">
        ✎
      </div>
      <h3 className="text-lg font-semibold text-slate-700">No documents yet</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Create your first document and share the link to start writing together.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="glass mt-4 flex flex-col items-center justify-center rounded-3xl py-16 text-center">
      <p className="text-sm font-medium text-rose-600">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-full bg-white/60 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white/80"
      >
        Try again
      </button>
    </div>
  );
}
