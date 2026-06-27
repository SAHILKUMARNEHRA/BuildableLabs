'use client';

import type { ConnectionStatus as Status } from '@/lib/collab/useCollaborativeDoc';

/**
 * A small pill that tells the user, at a glance, whether their edits are
 * syncing live, reconnecting, or being saved locally while offline.
 */
export function ConnectionStatus({ status, online }: { status: Status; online: boolean }) {
  // Offline takes priority — edits are safe locally and will sync on reconnect.
  const state = !online
    ? { label: 'Offline · saved locally', color: 'bg-amber-400', text: 'text-amber-700', pulse: false }
    : status === 'connected'
      ? { label: 'Live', color: 'bg-emerald-400', text: 'text-emerald-700', pulse: true }
      : status === 'connecting'
        ? { label: 'Connecting…', color: 'bg-slate-400', text: 'text-slate-500', pulse: true }
        : { label: 'Reconnecting…', color: 'bg-amber-400', text: 'text-amber-700', pulse: true };

  return (
    <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold">
      <span className="relative flex h-2 w-2">
        {state.pulse && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${state.color} opacity-60`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${state.color}`} />
      </span>
      <span className={state.text}>{state.label}</span>
    </span>
  );
}
