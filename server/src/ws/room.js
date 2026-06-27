import * as Y from 'yjs';
import { Awareness, removeAwarenessStates } from 'y-protocols/awareness';
import {
  broadcastDocUpdate,
  broadcastAwareness,
} from './syncProtocol.js';
import {
  loadDocumentState,
  saveDocumentState,
  saveSnapshot,
} from '../persistence/documentStore.js';

// How long after the last edit we wait before writing to Supabase. Debouncing
// turns a burst of keystrokes into a single save instead of hammering storage.
const SAVE_DEBOUNCE_MS = 2000;

// Minimum gap between two history snapshots for the same document.
const SNAPSHOT_INTERVAL_MS = 60_000;

/**
 * A Room is the live, in-memory representation of one document while at least
 * one person has it open. It owns:
 *   - the authoritative Y.Doc (CRDT state)
 *   - the Awareness instance (presence + cursors)
 *   - the set of open connections
 *   - debounced persistence to Supabase
 *
 * When the last connection leaves, the room flushes to storage and is
 * disposed by the RoomManager.
 */
export class Room {
  constructor(documentId) {
    this.documentId = documentId;
    this.doc = new Y.Doc();
    this.awareness = new Awareness(this.doc);
    // The server is a relay, not a participant, so it has no local presence.
    this.awareness.setLocalState(null);

    /** @type {Map<import('ws').WebSocket, Set<number>>} conn -> awareness client ids */
    this.connections = new Map();

    this.saveTimer = null;
    this.lastSnapshotAt = 0;
    this.dirty = false;

    // Resolves once the persisted state has been loaded into this.doc.
    this.ready = this.#load();

    this.doc.on('update', this.#onDocUpdate);
    this.awareness.on('update', this.#onAwarenessUpdate);
  }

  async #load() {
    const state = await loadDocumentState(this.documentId);
    if (state) {
      Y.applyUpdate(this.doc, state, 'persistence');
    }
  }

  #onDocUpdate = (update, origin) => {
    // Relay the change to everyone else and remember that we have unsaved work.
    broadcastDocUpdate(update, this.connections);

    // Loading persisted state should not immediately mark the doc dirty.
    if (origin === 'persistence') return;

    this.dirty = true;
    this.#scheduleSave();
    this.#maybeSnapshot(origin);
  };

  #onAwarenessUpdate = ({ added, updated, removed }, origin) => {
    const changed = added.concat(updated, removed);

    // Track which awareness ids belong to which socket so we can clean up
    // presence when that socket disconnects.
    if (origin instanceof Object && this.connections.has(origin)) {
      const ids = this.connections.get(origin);
      added.forEach((id) => ids.add(id));
      removed.forEach((id) => ids.delete(id));
    }

    broadcastAwareness(this.awareness, changed, this.connections);
  };

  #scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
  }

  #maybeSnapshot(origin) {
    const now = Date.now();
    if (now - this.lastSnapshotAt < SNAPSHOT_INTERVAL_MS) return;
    this.lastSnapshotAt = now;
    const authorId = typeof origin?.userId === 'string' ? origin.userId : null;
    saveSnapshot(this.documentId, this.doc, authorId);
  }

  /** Persists the current state immediately if there is anything to save. */
  async flush() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.dirty) return;
    this.dirty = false;
    await saveDocumentState(this.documentId, this.doc);
  }

  addConnection(conn) {
    this.connections.set(conn, new Set());
  }

  removeConnection(conn) {
    const controlledIds = this.connections.get(conn);
    this.connections.delete(conn);
    // Drop the presence entries owned by this socket so others stop seeing it.
    if (controlledIds && controlledIds.size > 0) {
      removeAwarenessStates(this.awareness, Array.from(controlledIds));
    }
  }

  get isEmpty() {
    return this.connections.size === 0;
  }

  async dispose() {
    await this.flush();
    this.doc.destroy();
  }
}

/**
 * Owns the lifecycle of every active Room. Rooms are created on demand when
 * the first user connects and torn down shortly after the last one leaves.
 */
export class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
  }

  async get(documentId) {
    let room = this.rooms.get(documentId);
    if (!room) {
      room = new Room(documentId);
      this.rooms.set(documentId, room);
    }
    await room.ready;
    return room;
  }

  async releaseIfEmpty(documentId) {
    const room = this.rooms.get(documentId);
    if (room && room.isEmpty) {
      this.rooms.delete(documentId);
      await room.dispose();
    }
  }
}

export const roomManager = new RoomManager();
