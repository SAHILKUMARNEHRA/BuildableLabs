'use client';

import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { getSupabaseClient } from '../supabase/client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/doc';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface CollaborationHandle {
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  status: ConnectionStatus;
  /** True once the local IndexedDB cache has loaded (offline-first paint). */
  localLoaded: boolean;
  /** Mirrors navigator.onLine so the UI can show an offline banner. */
  online: boolean;
}

/**
 * Sets up everything needed for one document to collaborate in real time:
 *
 *   1. A Y.Doc — the CRDT that merges concurrent edits without conflicts.
 *   2. IndexedDB persistence — the document paints instantly from local cache
 *      and edits made offline are queued, then synced on reconnect.
 *   3. A WebsocketProvider — talks to our custom backend, authenticated with
 *      the user's Supabase access token, broadcasting changes + presence.
 *
 * The Y.Doc is created once per document id and torn down on unmount so we
 * never leak sockets or duplicate providers across navigations.
 */
export function useCollaborativeDoc(documentId: string): CollaborationHandle {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [localLoaded, setLocalLoaded] = useState(false);
  const [online, setOnline] = useState(true);

  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ydoc = new Y.Doc();
    docRef.current = ydoc;

    // 1. Offline-first: hydrate from IndexedDB before (and regardless of) the
    //    network. Guarded because IndexedDB can be unavailable (private mode,
    //    storage disabled) — a failure here must never crash the editor.
    let idb: IndexeddbPersistence | null = null;
    try {
      idb = new IndexeddbPersistence(`collab-doc-${documentId}`, ydoc);
      idb.once('synced', () => {
        if (!cancelled) setLocalLoaded(true);
      });
    } catch (err) {
      console.warn('[collab] local cache unavailable:', (err as Error).message);
      setLocalLoaded(true);
    }

    // 2. Connect to the custom WS backend with the user's access token so the
    //    server can authenticate and authorise the room.
    async function connect() {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session) return;

      try {
        const provider = new WebsocketProvider(WS_URL, documentId, ydoc, {
          params: { token: session.access_token },
        });
        providerRef.current = provider;

        provider.on('status', ({ status: s }: { status: string }) => {
          if (cancelled) return;
          setStatus(s === 'connected' ? 'connected' : 'disconnected');
        });
        // y-websocket surfaces connection errors here; we log and let it retry
        // on its own rather than letting anything bubble up and crash React.
        provider.on('connection-error', () => setStatus('disconnected'));
      } catch (err) {
        console.error('[collab] could not open realtime connection:', (err as Error).message);
        setStatus('disconnected');
      }

      setReady(true);
    }

    connect();

    return () => {
      cancelled = true;
      providerRef.current?.destroy();
      idb?.destroy();
      ydoc.destroy();
      providerRef.current = null;
      docRef.current = null;
    };
    // Re-run only when the document changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  // Track browser online/offline so we can show a clear banner.
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // `ready` forces a re-render once the provider has been created (it is set
  // asynchronously after the access token resolves).
  void ready;
  return {
    ydoc: docRef.current,
    provider: providerRef.current,
    status,
    localLoaded,
    online,
  };
}
