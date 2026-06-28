'use client';

import { useState } from 'react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

/**
 * A small glassy confirmation modal for destructive or important actions.
 * Handles its own busy state so the confirm button shows a spinner while the
 * async action runs.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-5 backdrop-blur-sm"
      onClick={onCancel}
    >
      <GlassCard strong className="w-full max-w-sm animate-fade-up p-6" >
        <div onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <p className="mt-1.5 text-sm text-slate-500">{message}</p>
          <div className="mt-6 flex justify-end gap-2">
            <GlassButton variant="ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handleConfirm}
              loading={busy}
              className={danger ? '!bg-gradient-to-br !from-rose-500 !to-red-600 !shadow-rose-500/30' : ''}
            >
              {confirmLabel}
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
