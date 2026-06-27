'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, type SnapshotMeta } from '@/lib/api';

/**
 * A slide-in drawer showing the document's version timeline. The WebSocket
 * server captures a snapshot at most once a minute while people are editing,
 * giving an audit trail of when the document changed and who triggered it.
 */
export function HistoryPanel({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getHistory(documentId)
      .then(({ snapshots }) => active && setSnapshots(snapshots))
      .catch((err) => active && setError(err instanceof ApiError ? err.message : 'Could not load history.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [documentId]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/20 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="glass-strong h-full w-full max-w-sm animate-fade-up overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Version history</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-white/60"
            aria-label="Close history"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/40" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-slate-500">
            No versions captured yet. History is saved automatically as the document is edited.
          </p>
        ) : (
          <ol className="relative space-y-1 border-l-2 border-indigo-200/70 pl-5">
            {snapshots.map((snap, i) => (
              <li key={snap.id} className="relative pb-4">
                <span className="absolute -left-[1.55rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-500" />
                <div className="rounded-xl bg-white/50 px-3.5 py-2.5">
                  <p className="text-sm font-semibold text-slate-700">
                    {i === 0 ? 'Latest version' : `Version ${snapshots.length - i}`}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(snap.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}
