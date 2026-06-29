import { WebSocketServer } from 'ws';
import { URL } from 'node:url';
import { verifyToken } from '../auth/verifyToken.js';
import { canAccessDocument, getUserRole } from '../persistence/access.js';
import { roomManager } from './room.js';
import {
  handleMessage,
  sendSyncStep1,
  sendAwarenessState,
} from './syncProtocol.js';

// Ping interval to detect and drop dead connections (e.g. laptop sleep).
const HEARTBEAT_MS = 30_000;

/**
 * Attaches the collaborative WebSocket server to an existing HTTP server.
 *
 * Clients connect to:  ws://host/doc/<documentId>?token=<supabase access token>
 *
 * Every connection is authenticated and authorised before it is allowed to
 * join a room, so a user can only sync documents they own or collaborate on.
 */
export function attachWebSocketServer(httpServer) {
  // `noServer` lets us run the auth check during the HTTP upgrade and reject
  // unauthorised clients before a WebSocket is ever established.
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', async (request, socket, head) => {
    try {
      const { pathname, searchParams } = new URL(
        request.url,
        `http://${request.headers.host}`
      );

      const match = pathname.match(/^\/doc\/([^/]+)$/);
      if (!match) return reject(socket, 404);
      const documentId = decodeURIComponent(match[1]);

      const token = searchParams.get('token');
      const user = await verifyToken(token);
      if (!user) return reject(socket, 401);

      const allowed = await canAccessDocument(documentId, user.id);
      if (!allowed) return reject(socket, 403);

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, { documentId, user });
      });
    } catch (err) {
      console.error('[ws] upgrade failed:', err.message);
      reject(socket, 500);
    }
  });

  wss.on('connection', (ws, context) => {
    handleConnection(ws, context).catch((err) => {
      console.error('[ws] connection error:', err.message);
      ws.close();
    });
  });

  // Heartbeat sweep: terminate sockets that stopped responding to pings.
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_MS);

  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}

async function handleConnection(ws, { documentId, user }) {
  ws.isAlive = true;
  // Stamp the user on the socket. Yjs uses the socket as the "origin" of every
  // update it applies, so the room can attribute each change (and the history
  // snapshot it triggers) to the person who made it.
  ws.userId = user.id;
  // Effective role decides whether this socket may write to the document.
  ws.role = (await getUserRole(documentId, user.id)) || 'viewer';
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  const room = await roomManager.get(documentId);
  room.addConnection(ws);

  ws.binaryType = 'arraybuffer';

  ws.on('message', (data) => {
    const bytes = new Uint8Array(data);
    handleMessage(bytes, ws, room.doc, room.awareness);
  });

  ws.on('close', async () => {
    room.removeConnection(ws);
    if (room.isEmpty) {
      await roomManager.releaseIfEmpty(documentId);
    }
  });

  // Hand the new client everything it needs to render the live document:
  // first the document state, then who else is currently editing.
  sendSyncStep1(ws, room.doc);
  sendAwarenessState(ws, room.awareness);
}

/** Closes a raw TCP socket during the upgrade with an HTTP status line. */
function reject(socket, code) {
  const messages = {
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
  };
  socket.write(`HTTP/1.1 ${code} ${messages[code] || 'Error'}\r\n\r\n`);
  socket.destroy();
}
