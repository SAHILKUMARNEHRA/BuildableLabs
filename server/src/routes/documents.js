import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../auth/verifyToken.js';
import { canAccessDocument, getUserRole } from '../persistence/access.js';
import { deleteDocumentState, decodeSnapshotText } from '../persistence/documentStore.js';

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

  // Tolerate the link_role column not existing yet (migration not applied):
  // fall back to a base select and default the role to 'editor'.
  let { data, error } = await supabase
    .from('documents')
    .select('id, title, owner_id, created_at, updated_at, link_role')
    .eq('id', req.params.id)
    .single();

  if (error) {
    ({ data, error } = await supabase
      .from('documents')
      .select('id, title, owner_id, created_at, updated_at')
      .eq('id', req.params.id)
      .single());
    if (data) data.link_role = 'editor';
  }

  if (error) {
    return res.status(404).json({ error: 'not_found', message: 'Document not found.' });
  }

  const isOwner = data.owner_id === req.user.id;
  const myRole = isOwner ? 'editor' : data.link_role || 'editor';

  res.json({ document: { ...data, is_owner: isOwner, my_role: myRole } });
});

/** PATCH /api/documents/:id/access -> change the share link's role (owner only). */
documentsRouter.patch('/:id/access', async (req, res) => {
  const role = req.body?.link_role;
  if (!['editor', 'commenter', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'invalid_role', message: 'Role must be editor, commenter or viewer.' });
  }

  const { data: doc } = await supabase
    .from('documents')
    .select('owner_id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!doc) return res.status(404).json({ error: 'not_found', message: 'Document not found.' });
  if (doc.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'forbidden', message: 'Only the owner can change sharing access.' });
  }

  const { error } = await supabase
    .from('documents')
    .update({ link_role: role })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: 'access_failed', message: error.message });
  res.json({ link_role: role });
});

/** GET /api/documents/:id/comments -> the comment thread. */
documentsRouter.get('/:id/comments', async (req, res) => {
  const allowed = await canAccessDocument(req.params.id, req.user.id);
  if (!allowed) {
    return res.status(403).json({ error: 'forbidden', message: 'You do not have access to this document.' });
  }

  const { data, error } = await supabase
    .from('document_comments')
    .select('id, body, author_name, created_at, user_id')
    .eq('document_id', req.params.id)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) return res.status(500).json({ error: 'comments_failed', message: error.message });
  res.json({ comments: data || [] });
});

/** POST /api/documents/:id/comments -> add a comment (editor or commenter only). */
documentsRouter.post('/:id/comments', async (req, res) => {
  const role = await getUserRole(req.params.id, req.user.id);
  if (!role) {
    return res.status(403).json({ error: 'forbidden', message: 'You do not have access to this document.' });
  }
  if (role === 'viewer') {
    return res.status(403).json({ error: 'read_only', message: 'Viewers cannot comment. Ask the owner for comment access.' });
  }

  const body = (req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'empty', message: 'Comment cannot be empty.' });
  if (body.length > 2000) return res.status(400).json({ error: 'too_long', message: 'Comment is too long.' });

  // Resolve a friendly author name from the profile.
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', req.user.id)
    .maybeSingle();
  const authorName =
    profile?.display_name || (profile?.email ? profile.email.split('@')[0] : 'Someone');

  const { data, error } = await supabase
    .from('document_comments')
    .insert({ document_id: req.params.id, user_id: req.user.id, author_name: authorName, body })
    .select('id, body, author_name, created_at, user_id')
    .single();

  if (error) return res.status(500).json({ error: 'comment_failed', message: error.message });
  res.status(201).json({ comment: data });
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

/** DELETE /api/documents/:id -> delete a document (owner only). */
documentsRouter.delete('/:id', async (req, res) => {
  const { data: doc } = await supabase
    .from('documents')
    .select('id, owner_id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!doc) {
    return res.status(404).json({ error: 'not_found', message: 'Document not found.' });
  }
  if (doc.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'forbidden', message: 'Only the owner can delete this document.' });
  }

  // Remove the binary state from storage first, then the row (snapshots and
  // collaborators cascade away via foreign keys).
  await deleteDocumentState(req.params.id);
  const { error } = await supabase.from('documents').delete().eq('id', req.params.id);

  if (error) {
    return res.status(500).json({ error: 'delete_failed', message: error.message });
  }

  res.json({ deleted: true });
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

/**
 * POST /api/documents/:id/images -> upload an image and get its public URL.
 *
 * The browser sends a base64 data URL; we decode it, push it to the public
 * "images" Supabase Storage bucket under the document's folder, and return the
 * public URL for the editor to embed. This is the assignment's
 * "File storage: Supabase Storage" in action, beyond the document snapshots.
 */
documentsRouter.post('/:id/images', async (req, res) => {
  const allowed = await canAccessDocument(req.params.id, req.user.id);
  if (!allowed) {
    return res.status(403).json({ error: 'forbidden', message: 'You do not have access to this document.' });
  }

  const dataUrl = req.body?.dataUrl;
  const match = typeof dataUrl === 'string' && dataUrl.match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: 'invalid_image', message: 'Expected a PNG, JPEG, GIF or WebP image.' });
  }

  const contentType = match[1];
  const ext = match[2] === 'jpeg' ? 'jpg' : match[2];
  const buffer = Buffer.from(match[3], 'base64');

  if (buffer.length > 5 * 1024 * 1024) {
    return res.status(413).json({ error: 'too_large', message: 'Images must be 5 MB or smaller.' });
  }

  const path = `${req.params.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('images').upload(path, buffer, { contentType });
  if (error) {
    return res.status(500).json({ error: 'upload_failed', message: error.message });
  }

  const { data } = supabase.storage.from('images').getPublicUrl(path);
  res.status(201).json({ url: data.publicUrl });
});

/**
 * GET /api/documents/:id/history -> the version timeline, newest first.
 *
 * Each version includes who made the edit that produced it (resolved to a
 * display name + colour) and the document's plain text at that point, so the
 * client can show "Alice — 2:14 PM" and diff what changed between versions.
 */
documentsRouter.get('/:id/history', async (req, res) => {
  const allowed = await canAccessDocument(req.params.id, req.user.id);
  if (!allowed) {
    return res.status(403).json({ error: 'forbidden', message: 'You do not have access to this document.' });
  }

  const { data, error } = await supabase
    .from('document_snapshots')
    .select('id, created_at, created_by, state')
    .eq('document_id', req.params.id)
    .order('created_at', { ascending: true }) // chronological so we can diff forward
    .limit(100);

  if (error) {
    return res.status(500).json({ error: 'history_failed', message: error.message });
  }

  const rows = data || [];

  // Resolve author names/colours in one query.
  const authorIds = [...new Set(rows.map((r) => r.created_by).filter(Boolean))];
  const authors = new Map();
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email, avatar_color')
      .in('id', authorIds);
    (profiles || []).forEach((p) =>
      authors.set(p.id, {
        name: p.display_name || (p.email ? p.email.split('@')[0] : 'Someone'),
        color: p.avatar_color || '#6366f1',
      })
    );
  }

  const snapshots = rows.map((row, i) => ({
    id: row.id,
    version: i + 1,
    created_at: row.created_at,
    author: row.created_by ? authors.get(row.created_by) || null : null,
    text: decodeSnapshotText(row.state),
  }));

  // Return newest first for display.
  snapshots.reverse();

  res.json({ snapshots });
});
