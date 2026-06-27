import { Router } from 'express';

export const healthRouter = Router();

/** Simple liveness probe for uptime checks and local sanity testing. */
healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'collab-editor-server', time: new Date().toISOString() });
});
