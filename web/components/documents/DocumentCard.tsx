'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, type DocumentMeta } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
 * A document tile in the dashboard grid. Clicking the body opens the editor;
 * a kebab menu (owners only) exposes inline rename and delete. The card is a
 * `div` rather than a link so the menu and rename input can live inside it
 * without nested-interactive-element issues.
 */
export function DocumentCard({
  doc,
  ownerId,
  onChange,
}: {
  doc: DocumentMeta;
  ownerId: string;
  onChange: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isOwner = doc.owner_id === ownerId;

  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the menu when clicking anywhere else.
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  function open() {
    if (renaming) return;
    router.push(`/documents/${doc.id}`);
  }

  async function saveRename() {
    const next = title.trim();
    setRenaming(false);
    if (!next || next === doc.title) {
      setTitle(doc.title);
      return;
    }
    try {
      await api.renameDocument(doc.id, next);
      toast('Renamed.', 'success');
      onChange();
    } catch (err) {
      setTitle(doc.title);
      toast(err instanceof ApiError ? err.message : 'Could not rename.', 'error');
    }
  }

  async function handleDelete() {
    try {
      await api.deleteDocument(doc.id);
      toast('Document deleted.', 'success');
      onChange();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not delete.', 'error');
    } finally {
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => e.key === 'Enter' && open()}
        className="glass glass-sheen group relative block cursor-pointer rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-lg"
      >
        <div className="mb-8 flex items-start justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400/80 to-violet-500/80 text-lg text-white shadow">
            ✎
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                isOwner ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isOwner ? 'Owner' : 'Shared'}
            </span>
            {isOwner && (
              <div className="relative" ref={menuRef}>
                <button
                  aria-label="Document options"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((v) => !v);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 opacity-0 transition hover:bg-white/70 hover:text-slate-600 group-hover:opacity-100"
                >
                  ⋯
                </button>
                {menuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="glass-strong absolute right-0 top-9 z-10 w-36 overflow-hidden rounded-xl py-1 text-sm shadow-glass-lg"
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setRenaming(true);
                      }}
                      className="block w-full px-4 py-2 text-left text-slate-700 hover:bg-white/60"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmDelete(true);
                      }}
                      className="block w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50/70"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {renaming ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setTitle(doc.title);
                setRenaming(false);
              }
            }}
            className="w-full rounded-lg border border-indigo-300 bg-white/80 px-2 py-1 text-base font-semibold text-slate-800 outline-none ring-2 ring-indigo-300/50"
          />
        ) : (
          <h3 className="truncate text-base font-semibold text-slate-800 group-hover:text-indigo-700">
            {doc.title}
          </h3>
        )}
        <p className="mt-1 text-xs text-slate-400">Edited {relativeTime(doc.updated_at)}</p>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this document?"
          message={`"${doc.title}" and its history will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
