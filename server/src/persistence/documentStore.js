import * as Y from 'yjs';
import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';

/**
 * Document persistence.
 *
 * The live collaborative state lives as a binary Yjs update. We keep the
 * latest snapshot of that binary in Supabase Storage (one object per
 * document) and we append point-in-time snapshots to the
 * `document_snapshots` table so users can browse and restore history.
 *
 * Metadata (title, owner, timestamps) lives in the `documents` table.
 */

const bucket = env.storageBucket;

function storagePath(documentId) {
  return `ydoc/${documentId}.bin`;
}

/**
 * Loads the persisted Yjs state for a document as raw bytes, or `null` if the
 * document has never been saved yet (brand new, empty document).
 */
export async function loadDocumentState(documentId) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storagePath(documentId));

  // A missing object is expected for a fresh document — not an error worth logging.
  if (error || !data) return null;

  const arrayBuffer = await data.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Persists the current Yjs document state and bumps the document's
 * `updated_at`. We encode the whole document as a single update which keeps
 * the stored blob compact and easy to reload.
 */
export async function saveDocumentState(documentId, ydoc) {
  const update = Y.encodeStateAsUpdate(ydoc);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath(documentId), update, {
      contentType: 'application/octet-stream',
      upsert: true,
    });

  if (error) {
    console.error(`[persistence] failed to save document ${documentId}:`, error.message);
    return;
  }

  await supabase
    .from('documents')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', documentId);
}

/**
 * Removes a document's persisted binary state from storage. Database rows
 * (the document row, snapshots, collaborators) are removed by the caller via
 * cascading deletes; this just cleans up the Storage object so we don't leak
 * orphaned files.
 */
export async function deleteDocumentState(documentId) {
  const { error } = await supabase.storage.from(bucket).remove([storagePath(documentId)]);
  // A missing object is fine — the document may never have been saved.
  if (error) {
    console.error(`[persistence] failed to delete state for ${documentId}:`, error.message);
  }
}

/**
 * Decodes a base64 Yjs snapshot back into the document's plain text, so the
 * history panel can show what the document said at each version (and diff
 * consecutive versions). Returns '' if the snapshot can't be read.
 */
export function decodeSnapshotText(base64) {
  try {
    const update = new Uint8Array(Buffer.from(base64, 'base64'));
    const doc = new Y.Doc();
    Y.applyUpdate(doc, update);
    const xmlString = doc.getXmlFragment('default').toString();
    doc.destroy();

    return xmlString
      // Block boundaries become line breaks so paragraphs don't run together.
      .replace(/<\/(paragraph|heading|listItem|blockquote|codeBlock|taskItem)>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return '';
  }
}

/**
 * Stores a history snapshot so the document timeline can be browsed later.
 * Kept separate from the "latest state" save so we control how often history
 * grows (see the room's snapshot scheduling).
 */
export async function saveSnapshot(documentId, ydoc, authorId) {
  const update = Y.encodeStateAsUpdate(ydoc);
  // Base64 is a convenient, JSON-safe way to store a small binary blob in a column.
  const base64 = Buffer.from(update).toString('base64');

  const { error } = await supabase.from('document_snapshots').insert({
    document_id: documentId,
    state: base64,
    created_by: authorId || null,
  });

  if (error) {
    console.error(`[persistence] failed to snapshot document ${documentId}:`, error.message);
  }
}
