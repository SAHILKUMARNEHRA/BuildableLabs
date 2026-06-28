'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, type SnapshotMeta } from '@/lib/api';
import { initialsFor } from '@/lib/collab/colors';
import { diffWords, diffStats, type DiffSegment } from '@/lib/editor/diff';

/**
 * Version history drawer.
 *
 * Shows the document's timeline newest-first. Each version names the person who
 * made the edit, when, and — by diffing against the previous version — exactly
 * which text they added (green) or removed (struck-through red).
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
        className="glass-strong h-full w-full max-w-md animate-fade-up overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Version history</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-white/60"
            aria-label="Close history"
          >
            ✕
          </button>
        </div>
        <p className="mb-5 text-xs text-slate-500">
          Who changed what, over time. Added text is highlighted, removed text is struck through.
        </p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-white/40" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-slate-500">
            No versions captured yet. History is saved automatically as people edit — keep typing
            and check back.
          </p>
        ) : (
          <ol className="space-y-3">
            {snapshots.map((snap, i) => (
              <VersionCard
                key={snap.id}
                snap={snap}
                // The previous (older) version is the next item, since the list
                // is newest-first.
                previousText={snapshots[i + 1]?.text ?? ''}
                isFirst={i === 0}
              />
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}

function VersionCard({
  snap,
  previousText,
  isFirst,
}: {
  snap: SnapshotMeta;
  previousText: string;
  isFirst: boolean;
}) {
  const segments = useMemo(() => diffWords(previousText, snap.text), [previousText, snap.text]);
  const stats = useMemo(() => diffStats(segments), [segments]);
  const authorName = snap.author?.name || 'Unknown';
  const authorColor = snap.author?.color || '#94a3b8';

  return (
    <li className="rounded-2xl bg-white/55 p-4">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white shadow"
          style={{ background: authorColor }}
          title={authorName}
        >
          {initialsFor(authorName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-700">
            {authorName}
            {isFirst && <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">Latest</span>}
          </p>
          <p className="text-xs text-slate-400">
            v{snap.version} · {new Date(snap.created_at).toLocaleString()}
          </p>
        </div>
        {(stats.added > 0 || stats.removed > 0) && (
          <div className="flex shrink-0 items-center gap-2 text-xs font-semibold">
            {stats.added > 0 && <span className="text-emerald-600">+{stats.added}</span>}
            {stats.removed > 0 && <span className="text-rose-500">−{stats.removed}</span>}
          </div>
        )}
      </div>

      <DiffPreview segments={segments} empty={snap.text.trim() === ''} />
    </li>
  );
}

function DiffPreview({ segments, empty }: { segments: DiffSegment[]; empty: boolean }) {
  if (empty) {
    return <p className="mt-2.5 text-xs italic text-slate-400">(empty document)</p>;
  }
  return (
    <div className="mt-2.5 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-white/60 p-2.5 text-[13px] leading-relaxed text-slate-600">
      {segments.map((seg, i) => {
        if (seg.type === 'added') {
          return (
            <span key={i} className="rounded bg-emerald-100 text-emerald-800">
              {seg.text}
            </span>
          );
        }
        if (seg.type === 'removed') {
          return (
            <span key={i} className="rounded bg-rose-100 text-rose-500 line-through">
              {seg.text}
            </span>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </div>
  );
}
