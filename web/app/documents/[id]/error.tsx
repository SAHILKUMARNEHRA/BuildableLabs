'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Route-level error boundary for the document editor.
 *
 * If anything in the editor subtree throws (a realtime hiccup, a transient
 * browser issue), this catches it and shows a calm recovery screen with a
 * one-click retry instead of a white "application error" page.
 */
export default function DocumentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[editor] recovered from error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="glass-strong w-full max-w-md rounded-3xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl text-white">
          ⟳
        </div>
        <h2 className="text-xl font-bold text-slate-800">This document hit a snag</h2>
        <p className="mt-2 text-sm text-slate-500">
          The connection or editor ran into a hiccup. Your saved work is safe — just reload to
          jump back in.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30"
          >
            Reload document
          </button>
          <Link
            href="/documents"
            className="glass rounded-full px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-white/60"
          >
            All documents
          </Link>
        </div>
      </div>
    </main>
  );
}
