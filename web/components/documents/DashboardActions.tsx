'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { TEMPLATES, type DocTemplate } from '@/lib/editor/templates';
import { useToast } from '@/components/ui/Toast';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassCard } from '@/components/ui/GlassCard';

/**
 * The two ways to start collaborating from the dashboard:
 *   - Create a brand-new document.
 *   - Join an existing one by pasting its share id.
 *
 * `onChange` lets the parent refresh its list after either action succeeds.
 */
export function DashboardActions({ onChange }: { onChange: () => void }) {
  const router = useRouter();
  const { toast } = useToast();

  const [creating, setCreating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  async function createFromTemplate(template: DocTemplate) {
    setPickerOpen(false);
    setCreating(true);
    try {
      const { document } = await api.createDocument(template.title);
      toast('Document created.', 'success');
      // Pass the template key so the editor seeds its content once.
      const suffix = template.key === 'blank' ? '' : `?t=${template.key}`;
      router.push(`/documents/${document.id}${suffix}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not create the document.', 'error');
      setCreating(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <GlassButton onClick={() => setPickerOpen(true)} loading={creating}>
          <span className="text-base leading-none">＋</span> New document
        </GlassButton>
        <GlassButton variant="secondary" onClick={() => setJoinOpen(true)}>
          Join with a link
        </GlassButton>
      </div>

      {pickerOpen && (
        <TemplatePicker onClose={() => setPickerOpen(false)} onPick={createFromTemplate} />
      )}

      {joinOpen && (
        <JoinModal
          onClose={() => setJoinOpen(false)}
          onJoined={() => {
            setJoinOpen(false);
            onChange();
          }}
        />
      )}
    </>
  );
}

/** Microsoft-Word-style "start from a template" gallery. */
function TemplatePicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (t: DocTemplate) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassCard strong className="w-full max-w-2xl p-7">
        <div onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold text-slate-800">Start a new document</h2>
          <p className="mt-1 text-sm text-slate-500">Pick a template, or start blank.</p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => onPick(t)}
                className="glass glass-sheen flex flex-col items-start gap-1 rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-glass-lg"
              >
                <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 text-xl">
                  {t.icon}
                </span>
                <span className="text-sm font-semibold text-slate-800">{t.name}</span>
                <span className="text-xs text-slate-400">{t.description}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <GlassButton variant="ghost" onClick={onClose}>
              Cancel
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function JoinModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accepts either a full editor URL or a bare document id.
  function extractId(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/documents\/([0-9a-fA-F-]{36})/);
    if (match) return match[1];
    if (/^[0-9a-fA-F-]{36}$/.test(trimmed)) return trimmed;
    return null;
  }

  async function join() {
    setError(null);
    const id = extractId(value);
    if (!id) {
      setError('Paste a valid document link or id.');
      return;
    }

    setLoading(true);
    try {
      await api.joinDocument(id);
      toast('Joined the document.', 'success');
      onJoined();
      router.push(`/documents/${id}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not join that document.';
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/20 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassCard
        strong
        className="w-full max-w-md animate-fade-up p-7"
        // Stop clicks inside the card from closing the modal.
      >
        <div onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold text-slate-800">Join a document</h2>
          <p className="mt-1 text-sm text-slate-500">
            Paste a document link or id that someone shared with you.
          </p>

          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && join()}
            placeholder="https://…/documents/<id>  or  <id>"
            className="mt-4 w-full rounded-xl border border-white/70 bg-white/60 px-4 py-2.5 text-sm text-slate-800 outline-none
              backdrop-blur focus:border-indigo-300 focus:ring-2 focus:ring-indigo-300/50"
          />

          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <GlassButton variant="ghost" onClick={onClose}>
              Cancel
            </GlassButton>
            <GlassButton onClick={join} loading={loading}>
              Join
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
