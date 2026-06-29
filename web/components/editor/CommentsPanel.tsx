'use client';

import { useEffect, useRef, useState } from 'react';
import { api, ApiError, type Comment } from '@/lib/api';
import { colorForUser, initialsFor } from '@/lib/collab/colors';
import { useToast } from '@/components/ui/Toast';

/**
 * Comments side panel. Editors and commenters can post; viewers see them
 * read-only. Comments are a simple per-document thread, loaded when the panel
 * opens and appended after posting (no heavy realtime — keeps it lag-free).
 */
export function CommentsPanel({
  documentId,
  canComment,
  onClose,
}: {
  documentId: string;
  canComment: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const listEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    api
      .getComments(documentId)
      .then(({ comments }) => active && setComments(comments))
      .catch(() => active && toast('Could not load comments.', 'error'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [documentId, toast]);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  async function post() {
    const text = body.trim();
    if (!text) return;
    setPosting(true);
    try {
      const { comment } = await api.addComment(documentId, text);
      setComments((prev) => [...prev, comment]);
      setBody('');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not post comment.', 'error');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/20 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="glass-strong flex h-full w-full max-w-sm animate-fade-up flex-col p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Comments</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-white/60"
            aria-label="Close comments"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-white/40" />
            ))
          ) : comments.length === 0 ? (
            <p className="mt-6 text-center text-sm text-slate-400">
              No comments yet.{canComment ? ' Start the conversation below.' : ''}
            </p>
          ) : (
            comments.map((c) => {
              const name = c.author_name || 'Someone';
              return (
                <div key={c.id} className="rounded-xl bg-white/55 p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: colorForUser(c.user_id || name) }}
                    >
                      {initialsFor(name)}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{name}</span>
                    <span className="ml-auto text-[11px] text-slate-400">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-slate-600">{c.body}</p>
                </div>
              );
            })
          )}
          <div ref={listEnd} />
        </div>

        {canComment ? (
          <div className="mt-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) post();
              }}
              placeholder="Add a comment…  (⌘/Ctrl + Enter to send)"
              rows={3}
              className="w-full resize-none rounded-xl border border-white/70 bg-white/60 px-3.5 py-2.5 text-sm text-slate-800 outline-none
                backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-300/40"
            />
            <button
              onClick={post}
              disabled={posting || !body.trim()}
              className="mt-2 w-full rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-50"
            >
              {posting ? 'Posting…' : 'Comment'}
            </button>
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-white/50 px-3.5 py-2.5 text-center text-xs text-slate-500">
            You have view-only access — ask the owner for comment access.
          </p>
        )}
      </aside>
    </div>
  );
}
