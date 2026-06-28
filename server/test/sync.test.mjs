/**
 * End-to-end sync test for the custom WebSocket backend.
 *
 * It boots a minimal server that reuses the *real* Room + syncProtocol code
 * (only the auth/authorisation step is skipped, since that is tested
 * separately and needs Supabase), then connects two genuine `y-websocket`
 * clients — exactly what the browser uses — and verifies that text typed in
 * one document appears in the other, and that presence/awareness propagates.
 *
 * Run with:  node test/sync.test.mjs
 */
import http from 'node:http';
import assert from 'node:assert';
import { WebSocketServer } from 'ws';
import { WebSocket } from 'ws';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { roomManager } from '../src/ws/room.js';
import {
  handleMessage,
  sendSyncStep1,
  sendAwarenessState,
} from '../src/ws/syncProtocol.js';

const PORT = 4555;

// --- Minimal server: same connection handling as src/ws/server.js, no auth ---
function startServer() {
  const httpServer = http.createServer();
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const match = new URL(req.url, `http://${req.headers.host}`).pathname.match(/^\/doc\/([^/]+)$/);
    if (!match) return socket.destroy();
    const documentId = decodeURIComponent(match[1]);
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, documentId));
  });

  wss.on('connection', async (ws, documentId) => {
    const room = await roomManager.get(documentId);
    room.addConnection(ws);
    ws.binaryType = 'arraybuffer';
    ws.on('message', (data) => handleMessage(new Uint8Array(data), ws, room.doc, room.awareness));
    ws.on('close', () => {
      room.removeConnection(ws);
      roomManager.releaseIfEmpty(documentId);
    });
    sendSyncStep1(ws, room.doc);
    sendAwarenessState(ws, room.awareness);
  });

  return new Promise((resolve) => httpServer.listen(PORT, () => resolve(httpServer)));
}

function makeClient(docId, user) {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(`ws://localhost:${PORT}/doc`, docId, doc, {
    WebSocketPolyfill: WebSocket,
    connect: true,
  });
  provider.awareness.setLocalStateField('user', user);
  return { doc, provider };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const server = await startServer();
  const DOC = 'test-doc-1';

  const alice = makeClient(DOC, { name: 'Alice', color: '#ec4899' });
  const bob = makeClient(DOC, { name: 'Bob', color: '#10b981' });

  // Wait for both providers to connect + perform the initial sync.
  await wait(600);

  // 1. Alice types -> Bob should converge.
  alice.doc.getText('content').insert(0, 'Hello from Alice');
  await wait(400);
  assert.strictEqual(
    bob.doc.getText('content').toString(),
    'Hello from Alice',
    'Bob did not receive Alice\'s text'
  );
  console.log('✓ text typed by Alice synced to Bob');

  // 2. Concurrent edits from both sides converge identically (CRDT merge).
  alice.doc.getText('content').insert(0, '[A] ');
  bob.doc.getText('content').insert(bob.doc.getText('content').length, ' [B]');
  await wait(500);
  assert.strictEqual(
    alice.doc.getText('content').toString(),
    bob.doc.getText('content').toString(),
    'Docs diverged after concurrent edits'
  );
  console.log('✓ concurrent edits converged to identical state:', JSON.stringify(alice.doc.getText('content').toString()));

  // 3. Presence/awareness: Alice should see Bob in her awareness states.
  const names = Array.from(alice.provider.awareness.getStates().values())
    .map((s) => s.user?.name)
    .filter(Boolean)
    .sort();
  assert.deepStrictEqual(names, ['Alice', 'Bob'], `presence wrong, saw: ${names}`);
  console.log('✓ presence/awareness shows both Alice and Bob');

  // 4. A late joiner gets the full document immediately.
  const carol = makeClient(DOC, { name: 'Carol', color: '#3b82f6' });
  await wait(500);
  assert.strictEqual(
    carol.doc.getText('content').toString(),
    alice.doc.getText('content').toString(),
    'Late joiner Carol did not receive existing content'
  );
  console.log('✓ late joiner received the existing document');

  // 5. With THREE clients connected, every client must see all three in its
  //    awareness (this is the presence the UI renders). Guards the bug where
  //    only some collaborators showed up.
  const seenBy = (client) =>
    Array.from(client.provider.awareness.getStates().values())
      .map((s) => s.user?.name)
      .filter(Boolean)
      .sort();
  for (const [who, client] of [['Alice', alice], ['Bob', bob], ['Carol', carol]]) {
    assert.deepStrictEqual(
      seenBy(client),
      ['Alice', 'Bob', 'Carol'],
      `${who} should see all three editors, saw: ${seenBy(client)}`
    );
  }
  console.log('✓ all three clients see all three editors in presence');

  alice.provider.destroy();
  bob.provider.destroy();
  carol.provider.destroy();
  server.close();
  console.log('\nAll sync tests passed ✅');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
