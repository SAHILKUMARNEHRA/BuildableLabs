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
