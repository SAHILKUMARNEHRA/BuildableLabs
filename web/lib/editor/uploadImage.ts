'use client';

import { getSupabaseClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/** Reads a File into a base64 data URL the backend can decode. */
function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image to Supabase Storage (via our backend, which holds the
 * service key) and returns its public URL. Used by the toolbar button and by
 * paste/drop handlers in the editor.
 */
export async function uploadImage(file: File, documentId: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be uploaded.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Images must be 5 MB or smaller.');
  }

  const dataUrl = await toDataUrl(file);

  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Your session has expired. Please sign in again.');

  const res = await fetch(`${API_URL}/api/documents/${documentId}/images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ dataUrl }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || 'Image upload failed.');
  return body.url as string;
}
