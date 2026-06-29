-- ============================================================================
-- Migration: role-based link sharing + comments
-- Run this ONCE in the Supabase SQL editor (after schema.sql).
-- Safe to re-run (idempotent).
-- ============================================================================

-- 1. Link role on a document: what someone who opens the share link can do.
--    'editor'    -> can edit the text
--    'commenter' -> can read + leave comments (no text edits)
--    'viewer'    -> can read only
alter table public.documents
  add column if not exists link_role text not null default 'editor';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'documents_link_role_chk') then
    alter table public.documents
      add constraint documents_link_role_chk check (link_role in ('editor', 'commenter', 'viewer'));
  end if;
end $$;

-- 2. Comments thread per document.
create table if not exists public.document_comments (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  author_name text,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists comments_document_idx
  on public.document_comments (document_id, created_at);

alter table public.document_comments enable row level security;

-- Reads allowed for document members (writes happen via the service-role backend).
drop policy if exists "comments readable by members" on public.document_comments;
create policy "comments readable by members" on public.document_comments
  for select using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and (
          d.owner_id = auth.uid()
          or exists (
            select 1 from public.document_collaborators c
            where c.document_id = d.id and c.user_id = auth.uid()
          )
        )
    )
  );
