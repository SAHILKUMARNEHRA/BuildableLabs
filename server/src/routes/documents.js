import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../auth/verifyToken.js';
import { canAccessDocument } from '../persistence/access.js';

/**
 * REST API for everything that is not real-time editing:
 *   - list the documents I can see
 *   - create a document
 *   - join an existing document by id
 *   - read a document's metadata
 *   - browse its history snapshots
 *
 * The live text itself flows over the WebSocket connection, not here.
 */
export const documentsRouter = Router();

documentsRouter.use(requireAuth);

/** GET /api/documents -> documents I own or collaborate on. */
documentsRouter.get('/', async (req, res) => {
  const userId = req.user.id;

  const [owned, shared] = await Promise.all([
    supabase
      .from('documents')
      .select('id, title, owner_id, created_at, updated_at')
      .eq('owner_id', userId),
    supabase
      .from('document_collaborators')
      .select('documents(id, title, owner_id, created_at, updated_at)')
      .eq('user_id', userId),
  ]);

  if (owned.error) {
    return res.status(500).json({ error: 'list_failed', message: owned.error.message });
  }

  const sharedDocs = (shared.data || [])
    .map((row) => row.documents)
    .filter(Boolean);

  // Merge and de-duplicate, newest first.
  const byId = new Map();
  [...(owned.data || []), ...sharedDocs].forEach((doc) => byId.set(doc.id, doc));
  const documents = Array.from(byId.values()).sort(
    (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
  );

  res.json({ documents });
});

/** POST /api/documents -> create a new, empty document owned by me. */
documentsRouter.post('/', async (req, res) => {
  const title = (req.body?.title || '').trim() || 'Untitled document';

  const { data, error } = await supabase
    .from('documents')
    .insert({ title, owner_id: req.user.id })
    .select('id, title, owner_id, created_at, updated_at')
    .single();

  if (error) {
    return res.status(500).json({ error: 'create_failed', message: error.message });
  }

  res.status(201).json({ document: data });
});

/** GET /api/documents/:id -> metadata, if I am allowed to see it. */
documentsRouter.get('/:id', async (req, res) => {
  const allowed = await canAccessDocument(req.params.id, req.user.id);
  if (!allowed) {
    return res.status(403).json({ error: 'forbidden', message: 'You do not have access to this document.' });
  }

  const { data, error } = await supabase
    .from('documents')
    .select('id, title, owner_id, created_at, updated_at')
    .eq('id', req.params.id)
    .single();

  if (error) {
    return res.status(404).json({ error: 'not_found', message: 'Document not found.' });
  }

  res.json({ document: data });
});

/** PATCH /api/documents/:id -> rename. */
documentsRouter.patch('/:id', async (req, res) => {
  const allowed = await canAccessDocument(req.params.id, req.user.id);
  if (!allowed) {
    return res.status(403).json({ error: 'forbidden', message: 'You do not have access to this document.' });
  }

  const title = (req.body?.title || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'invalid_title', message: 'Title cannot be empty.' });
  }

  const { data, error } = await supabase
    .from('documents')
    .update({ title })
    .eq('id', req.params.id)
    .select('id, title, owner_id, created_at, updated_at')
    .single();

  if (error) {
    return res.status(500).json({ error: 'update_failed', message: error.message });
  }

  res.json({ document: data });
});

/** POST /api/documents/:id/join -> add me as a collaborator. */
documentsRouter.post('/:id/join', async (req, res) => {
  const documentId = req.params.id;

  const { data: doc } = await supabase
    .from('documents')
    .select('id, owner_id')
    .eq('id', documentId)
    .maybeSingle();

  if (!doc) {
    return res.status(404).json({ error: 'not_found', message: 'No document with that id exists.' });
  }

  if (doc.owner_id === req.user.id) {
    return res.json({ joined: true, message: 'You already own this document.' });
  }

  const { error } = await supabase
    .from('document_collaborators')
    .upsert(
      { document_id: documentId, user_id: req.user.id },
      { onConflict: 'document_id,user_id', ignoreDuplicates: true }
    );

  if (error) {
    return res.status(500).json({ error: 'join_failed', message: error.message });
  }

  res.json({ joined: true });
});

/** GET /api/documents/:id/history -> list snapshots, newest first. */
documentsRouter.get('/:id/history', async (req, res) => {
  const allowed = await canAccessDocument(req.params.id, req.user.id);
  if (!allowed) {
    return res.status(403).json({ error: 'forbidden', message: 'You do not have access to this document.' });
  }

  const { data, error } = await supabase
    .from('document_snapshots')
    .select('id, created_at, created_by')
    .eq('document_id', req.params.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return res.status(500).json({ error: 'history_failed', message: error.message });
  }

  res.json({ snapshots: data || [] });
});
