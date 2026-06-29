'use client';

import { getSupabaseClient } from './supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Thin wrapper around fetch for our REST backend.
 *
 * It automatically attaches the current Supabase access token as a Bearer
 * header and normalises errors into an `ApiError` carrying a friendly message,
 * so callers can just `try/catch` and show `err.message`.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new ApiError(401, 'unauthorized', 'Your session has expired. Please sign in again.');
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'network', 'Cannot reach the server. Is the backend running?');
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, body.error || 'error', body.message || 'Request failed.');
  }

  return body as T;
}

// --- Types -----------------------------------------------------------------
export type ShareRole = 'editor' | 'commenter' | 'viewer';

export interface DocumentMeta {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  link_role?: ShareRole;
  my_role?: ShareRole;
  is_owner?: boolean;
}

export interface Comment {
  id: string;
  body: string;
  author_name: string | null;
  created_at: string;
  user_id: string | null;
}

export interface SnapshotMeta {
  id: string;
  version: number;
  created_at: string;
  author: { name: string; color: string } | null;
  text: string;
}

// --- Endpoints --------------------------------------------------------------
export const api = {
  listDocuments: () => request<{ documents: DocumentMeta[] }>('/api/documents'),

  createDocument: (title: string) =>
    request<{ document: DocumentMeta }>('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  getDocument: (id: string) => request<{ document: DocumentMeta }>(`/api/documents/${id}`),

  renameDocument: (id: string, title: string) =>
    request<{ document: DocumentMeta }>(`/api/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),

  joinDocument: (id: string) =>
    request<{ joined: boolean }>(`/api/documents/${id}/join`, { method: 'POST' }),

  deleteDocument: (id: string) =>
    request<{ deleted: boolean }>(`/api/documents/${id}`, { method: 'DELETE' }),

  getHistory: (id: string) => request<{ snapshots: SnapshotMeta[] }>(`/api/documents/${id}/history`),

  setAccess: (id: string, link_role: ShareRole) =>
    request<{ link_role: ShareRole }>(`/api/documents/${id}/access`, {
      method: 'PATCH',
      body: JSON.stringify({ link_role }),
    }),

  getComments: (id: string) => request<{ comments: Comment[] }>(`/api/documents/${id}/comments`),

  addComment: (id: string, body: string) =>
    request<{ comment: Comment }>(`/api/documents/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
};
