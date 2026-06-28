import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { documentsRouter } from './routes/documents.js';
import { attachWebSocketServer } from './ws/server.js';

const app = express();

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  })
);
// Raised limit so base64-encoded image uploads fit (real cap is enforced in
// the upload route and by the storage bucket's file_size_limit).
app.use(express.json({ limit: '8mb' }));

app.use('/health', healthRouter);
app.use('/api/documents', documentsRouter);

// Fallback 404 for unknown REST routes (keeps responses JSON, not HTML).
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: `No route for ${req.method} ${req.path}` });
});

// Centralised error handler so a thrown error never leaks a stack trace.
app.use((err, _req, res, _next) => {
  console.error('[http] unhandled error:', err);
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong on our end.' });
});

const server = http.createServer(app);
attachWebSocketServer(server);

server.listen(env.port, () => {
  console.log(`\n  collab-editor server ready`);
  console.log(`  REST      http://localhost:${env.port}/api`);
  console.log(`  WebSocket ws://localhost:${env.port}/doc/<id>\n`);
});

// Make sure in-memory rooms get a chance to flush on shutdown.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n  ${signal} received, shutting down...`);
    server.close(() => process.exit(0));
  });
}
