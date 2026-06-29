'use client';

import { useState } from 'react';
import { api, ApiError, type ShareRole } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';

const ROLES: { value: ShareRole; label: string; hint: string; icon: string }[] = [
  { value: 'editor', label: 'Editor', hint: 'Can edit the document', icon: '✏️' },
  { value: 'commenter', label: 'Commenter', hint: 'Can read and add comments', icon: '💬' },
  { value: 'viewer', label: 'Viewer', hint: 'Can only read', icon: '👁️' },
];

/**
 * "Share" dialog, modelled on Google/Microsoft docs: the owner picks what
 * anyone with the link can do (Editor / Commenter / Viewer) and copies the
 * link. Non-owners see the current access level and can copy the link.
 */
export function ShareDialog({
  documentId,
  isOwner,
  initialRole,
  onClose,
}: {
  documentId: string;
  isOwner: boolean;
  initialRole: ShareRole;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [role, setRole] = useState<ShareRole>(initialRole);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = typeof window !== 'undefined' ? `${window.location.origin}/documents/${documentId}` : '';

  async function changeRole(next: ShareRole) {
    if (next === role) return;
    const prev = role;
    setRole(next);
    setSaving(true);
    try {
      await api.setAccess(documentId, next);
      toast(`Anyone with the link can now ${next === 'editor' ? 'edit' : next === 'commenter' ? 'comment' : 'view'}.`, 'success');
    } catch (err) {
      setRole(prev);
      toast(err instanceof ApiError ? err.message : 'Could not update access.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast('Link copied to clipboard.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Could not copy the link.', 'error');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassCard strong className="w-full max-w-md p-7">
        <div onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold text-slate-800">Share this document</h2>
          <p className="mt-1 text-sm text-slate-500">Anyone with the link can:</p>

          <div className="mt-3 space-y-2">
            {ROLES.map((r) => {
              const active = role === r.value;
              return (
                <button
                  key={r.value}
                  disabled={!isOwner || saving}
                  onClick={() => changeRole(r.value)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition
                    ${active ? 'border-indigo-300 bg-indigo-50/70' : 'border-white/70 bg-white/50 hover:bg-white/70'}
                    ${!isOwner ? 'cursor-default opacity-90' : ''}`}
                >
                  <span className="text-lg">{r.icon}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-700">{r.label}</span>
                    <span className="block text-xs text-slate-400">{r.hint}</span>
                  </span>
                  {active && <span className="font-bold text-indigo-600">✓</span>}
                </button>
              );
            })}
          </div>

          {!isOwner && (
            <p className="mt-3 text-xs text-slate-400">Only the owner can change the access level.</p>
          )}

          <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/70 bg-white/60 p-1.5 pl-3">
            <span className="flex-1 truncate text-sm text-slate-500">{link}</span>
            <GlassButton onClick={copyLink} className="shrink-0">
              {copied ? 'Copied ✓' : 'Copy link'}
            </GlassButton>
          </div>

          <div className="mt-5 flex justify-end">
            <GlassButton variant="ghost" onClick={onClose}>
              Done
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
