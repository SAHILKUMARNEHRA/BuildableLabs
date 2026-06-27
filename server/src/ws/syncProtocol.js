import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';

/**
 * Wire protocol helpers.
 *
 * This is a small, custom implementation of the Yjs "websocket protocol".
 * Every message on the wire is a binary frame whose first byte is the
 * message type. We support exactly two:
 *
 *   messageSync (0)      -> Yjs document sync (state vectors + updates)
 *   messageAwareness (1) -> presence / cursors (who is online, where)
 *
 * Keeping this in one place means the room and server code can stay focused
 * on lifecycle and routing rather than byte twiddling.
 */
export const MESSAGE_SYNC = 0;
export const MESSAGE_AWARENESS = 1;

function send(conn, data) {
  // 1 === WebSocket.OPEN. Guard against writing to a closing socket.
  if (conn.readyState !== 1) return;
  try {
    conn.send(data);
  } catch {
    conn.close();
  }
}

/**
 * Kicks off a sync with a freshly connected client by sending "sync step 1"
 * (our current state vector). The client replies with everything we are
 * missing plus its own step 1.
 */
export function sendSyncStep1(conn, doc) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  send(conn, encoding.toUint8Array(encoder));
}

/**
 * Sends the current awareness (presence) state of everyone in the room to a
 * single client so a late joiner immediately sees who else is here.
 */
export function sendAwarenessState(conn, awareness) {
  const states = awareness.getStates();
  if (states.size === 0) return;

  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(states.keys()))
  );
  send(conn, encoding.toUint8Array(encoder));
}

/**
 * Handles a single inbound binary frame from a client and returns whether the
 * document changed (so the room can schedule a save). `reply` is the encoder
 * the server may write a response into.
 */
export function handleMessage(message, conn, doc, awareness) {
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case MESSAGE_SYNC: {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      // readSyncMessage applies incoming updates to `doc` and may write a
      // reply (e.g. the updates the client still needs) into `encoder`.
      syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
      if (encoding.length(encoder) > 1) {
        send(conn, encoding.toUint8Array(encoder));
      }
      return;
    }
    case MESSAGE_AWARENESS: {
      awarenessProtocol.applyAwarenessUpdate(
        awareness,
        decoding.readVarUint8Array(decoder),
        conn
      );
      return;
    }
    default:
      // Unknown message type — ignore rather than crash the connection.
      return;
  }
}

/**
 * Broadcasts a raw Yjs document update to every connection in the room.
 */
export function broadcastDocUpdate(update, connections) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeUpdate(encoder, update);
  const data = encoding.toUint8Array(encoder);
  connections.forEach((_, conn) => send(conn, data));
}

/**
 * Broadcasts an awareness (presence) change to every connection in the room.
 */
export function broadcastAwareness(awareness, changedClients, connections) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
  );
  const data = encoding.toUint8Array(encoder);
  connections.forEach((_, conn) => send(conn, data));
}
