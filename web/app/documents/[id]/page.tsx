'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthProvider';
import { api, ApiError, type DocumentMeta } from '@/lib/api';
import { colorForUser } from '@/lib/collab/colors';
import { useCollaborativeDoc } from '@/lib/collab/useCollaborativeDoc';
import { useToast } from '@/components/ui/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { CollaborativeEditor } from '@/components/editor/Editor';
import { CollaboratorBar } from '@/components/editor/CollaboratorBar';
import { ConnectionStatus } from '@/components/editor/ConnectionStatus';
import { HistoryPanel } from '@/components/editor/HistoryPanel';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; doc: DocumentMeta }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string };

/**
 * The editor screen. Loads the document's metadata, then mounts the
 * collaborative editor once the realtime connection has a Y.Doc + provider.
 * Handles the "shared link but not a member yet" case with an inline join CTA.
 */
export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [historyOpen, setHistoryOpen] = useState(false);

  const collab = useCollaborativeDoc(id);

  const loadMeta = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const { document } = await api.getDocument(id);
      setState({ kind: 'ready', doc: document });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setState({ kind: 'forbidden' });
      } else {
        setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Could not open this document.' });
      }
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    loadMeta();
  }, [user, authLoading, router, loadMeta]);

  if (authLoading || state.kind === 'loading') {
    return <CenteredSpinner label="Opening document…" />;
  }

  if (state.kind === 'forbidden') {
    return <JoinGate documentId={id} onJoined={loadMeta} />;
  }

  if (state.kind === 'error') {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="mx-auto mt-20 max-w-md px-4 text-center">
          <p className="text-sm font-medium text-rose-600">{state.message}</p>
          <Link href="/documents" className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:underline">
            ← Back to documents
          </Link>
        </div>
      </div>
    );
  }

  const editorReady = collab.ydoc && collab.provider;

  return (
    <div className="min-h-screen pb-24">
      <AppHeader
        center={<TitleEditor documentId={id} initialTitle={state.doc.title} />}
      />

      {/* Live status row: connection, presence, and document actions. */}
      <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3">
          <ConnectionStatus status={collab.status} online={collab.online} />
          {collab.provider && <CollaboratorBar provider={collab.provider} />}
        </div>
        <div className="flex items-center gap-2">
          <ShareButton documentId={id} />
          <button
            onClick={() => setHistoryOpen(true)}
            className="glass rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white/60"
          >
            History
          </button>
        </div>
      </div>

      <main className="mt-6 px-4">
        {editorReady ? (
          <CollaborativeEditor
            ydoc={collab.ydoc!}
            provider={collab.provider!}
            user={{ name: user!.displayName, color: colorForUser(user!.id) }}
          />
        ) : (
          <div className="mx-auto max-w-3xl">
            <div className="glass-strong h-96 animate-pulse rounded-3xl" />
          </div>
        )}
      </main>

      {historyOpen && <HistoryPanel documentId={id} onClose={() => setHistoryOpen(false)} />}
    </div>
  );
}

/** Inline, debounced-on-blur title editing in the header. */
function TitleEditor({
  documentId,
  initialTitle,
}: {
  documentId: string;
  initialTitle: string;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(initialTitle);
  const lastSaved = useRef(initialTitle);

  async function save() {
    const next = title.trim();
    if (!next || next === lastSaved.current) {
      setTitle(lastSaved.current);
      return;
    }
    try {
      await api.renameDocument(documentId, next);
      lastSaved.current = next;
    } catch (err) {
      setTitle(lastSaved.current);
      toast(err instanceof ApiError ? err.message : 'Could not rename the document.', 'error');
    }
  }

  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      aria-label="Document title"
      className="w-full truncate rounded-lg bg-transparent px-2 py-1 text-center text-base font-semibold text-slate-800
        outline-none transition hover:bg-white/40 focus:bg-white/60"
    />
  );
}

/** Copies the shareable document link to the clipboard. */
function ShareButton({ documentId }: { documentId: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/documents/${documentId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast('Share link copied to clipboard.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Could not copy the link.', 'error');
    }
  }

  return (
    <button
      onClick={share}
      className="glass glass-sheen rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white/60"
    >
      {copied ? 'Copied ✓' : 'Share'}
    </button>
  );
}

/** Shown when a user opens a shared link they have not joined yet. */
function JoinGate({ documentId, onJoined }: { documentId: string; onJoined: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function join() {
    setLoading(true);
    try {
      await api.joinDocument(documentId);
      toast('Joined! Loading the document…', 'success');
      onJoined();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not join this document.', 'error');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="mx-auto mt-24 max-w-md px-4 text-center">
        <div className="glass-strong rounded-3xl p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl text-white">
            🔗
          </div>
          <h2 className="text-xl font-bold text-slate-800">Join this document</h2>
          <p className="mt-2 text-sm text-slate-500">
            Someone shared this document with you. Join to start collaborating in real time.
          </p>
          <button
            onClick={join}
            disabled={loading}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-60"
          >
            {loading ? 'Joining…' : 'Join document'}
          </button>
          <div className="mt-4">
            <Link href="/documents" className="text-sm font-medium text-slate-400 hover:text-slate-600">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CenteredSpinner({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-400 border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
    </main>
  );
}
