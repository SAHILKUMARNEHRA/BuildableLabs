import { supabase } from '../config/supabase.js';

/**
 * Authorisation helper shared by the REST API and the WebSocket server.
 *
 * A user may access a document if they own it OR they appear in
 * `document_collaborators`. We keep this in one place so the rules can never
 * drift between the HTTP and WebSocket entry points.
 */
export async function canAccessDocument(documentId, userId) {
  const { data: doc } = await supabase
    .from('documents')
    .select('id, owner_id')
    .eq('id', documentId)
    .maybeSingle();

  if (!doc) return false;
  if (doc.owner_id === userId) return true;

  const { data: collab } = await supabase
    .from('document_collaborators')
    .select('document_id')
    .eq('document_id', documentId)
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(collab);
}

/**
 * Resolves a user's effective role on a document:
 *   'editor' | 'commenter' | 'viewer' | null (no access)
 *
 * The owner is always an editor. Everyone else who has joined gets the
 * document's current link role (like "anyone with the link can edit/comment/view").
 */
export async function getUserRole(documentId, userId) {
  const doc = await getDocMeta(documentId);

  if (!doc) return null;
  if (doc.owner_id === userId) return 'editor';

  const { data: collab } = await supabase
    .from('document_collaborators')
    .select('document_id')
    .eq('document_id', documentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!collab) return null;
  return doc.link_role || 'editor';
}

/**
 * Reads a document's owner + link role, tolerating the case where the
 * `link_role` column does not exist yet (migration not run) — in that case it
 * defaults to 'editor', so the app keeps working until the migration is applied.
 */
export async function getDocMeta(documentId) {
  let res = await supabase
    .from('documents')
    .select('owner_id, link_role')
    .eq('id', documentId)
    .maybeSingle();

  if (res.error) {
    res = await supabase.from('documents').select('owner_id').eq('id', documentId).maybeSingle();
    if (res.data) res.data.link_role = 'editor';
  }
  return res.data || null;
}
