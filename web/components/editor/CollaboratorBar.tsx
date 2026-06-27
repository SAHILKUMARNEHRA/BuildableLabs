'use client';

import { useEffect, useState } from 'react';
import type { WebsocketProvider } from 'y-websocket';
import { initialsFor } from '@/lib/collab/colors';

interface Collaborator {
  clientId: number;
  name: string;
  color: string;
}

/**
 * Live presence. Subscribes to the provider's awareness and renders an avatar
 * stack of everyone currently in the document, plus a "Alice is editing" style
 * caption. Updates instantly as people join and leave.
 *
 * `selfClientId` is excluded so users don't see themselves in the list.
 */
export function CollaboratorBar({ provider }: { provider: WebsocketProvider }) {
  const [others, setOthers] = useState<Collaborator[]>([]);

  useEffect(() => {
    const { awareness } = provider;

    const sync = () => {
      const list: Collaborator[] = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return; // skip myself
        const user = (state as { user?: { name?: string; color?: string } }).user;
        if (user?.name) {
          list.push({ clientId, name: user.name, color: user.color || '#6366f1' });
        }
      });
      setOthers(list);
    };

    sync();
    awareness.on('change', sync);
    return () => awareness.off('change', sync);
  }, [provider]);

  if (others.length === 0) {
    return <span className="text-xs font-medium text-slate-400">You’re the only one here</span>;
  }

  const caption =
    others.length === 1
      ? `${others[0].name} is editing`
      : others.length === 2
        ? `${others[0].name} and ${others[1].name} are editing`
        : `${others[0].name} and ${others.length - 1} others are editing`;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex -space-x-2">
        {others.slice(0, 4).map((c) => (
          <span
            key={c.clientId}
            title={c.name}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/80 text-[11px] font-bold text-white shadow"
            style={{ background: c.color }}
          >
            {initialsFor(c.name)}
          </span>
        ))}
        {others.length > 4 && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/80 bg-slate-400 text-[11px] font-bold text-white shadow">
            +{others.length - 4}
          </span>
        )}
      </div>
      <span className="hidden text-xs font-medium text-slate-500 sm:inline">{caption}</span>
    </div>
  );
}
