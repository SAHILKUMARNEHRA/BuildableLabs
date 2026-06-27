'use client';

import Link from 'next/link';
import type { DocumentMeta } from '@/lib/api';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * A single document tile in the dashboard grid. The whole card is a link into
 * the editor; ownership is indicated with a small badge.
 */
export function DocumentCard({ doc, ownerId }: { doc: DocumentMeta; ownerId: string }) {
  const isOwner = doc.owner_id === ownerId;

  return (
    <Link
      href={`/documents/${doc.id}`}
      className="glass glass-sheen group block rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-lg"
    >
      <div className="mb-8 flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400/80 to-violet-500/80 text-lg text-white shadow">
          ✎
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            isOwner ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isOwner ? 'Owner' : 'Shared'}
        </span>
      </div>
      <h3 className="truncate text-base font-semibold text-slate-800 group-hover:text-indigo-700">
        {doc.title}
      </h3>
      <p className="mt-1 text-xs text-slate-400">Edited {relativeTime(doc.updated_at)}</p>
    </Link>
  );
}
