-- ============================================================================
-- Collaborative Document Editor — database schema
--
-- Run this once in the Supabase SQL editor (Dashboard -> SQL -> New query).
-- It is idempotent: re-running it will not drop your data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles
-- One row per auth user. Created automatically by the trigger below so the
-- app always has a display name and a stable colour for presence/cursors.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  avatar_color text not null default '#6366f1',
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- documents
-- Metadata only. The actual rich-text lives as a binary Yjs snapshot in
-- Supabase Storage (bucket: "documents", path: ydoc/<id>.bin).
-- ----------------------------------------------------------------------------
create table if not exists public.documents (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default 'Untitled document',
  owner_id   uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_owner_idx on public.documents (owner_id);

-- ----------------------------------------------------------------------------
-- document_collaborators
-- Anyone who has joined a document they do not own. Owner + collaborators are
-- the set of people allowed to open and edit a document.
-- ----------------------------------------------------------------------------
create table if not exists public.document_collaborators (
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (document_id, user_id)
);

create index if not exists collaborators_user_idx on public.document_collaborators (user_id);

-- ----------------------------------------------------------------------------
-- document_snapshots
-- Point-in-time history. Each row is a base64-encoded Yjs state captured by
-- the WebSocket server so users can browse a document's timeline.
-- ----------------------------------------------------------------------------
create table if not exists public.document_snapshots (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  state       text not null,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists snapshots_document_idx on public.document_snapshots (document_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Auto-create a profile whenever a new auth user signs up (email or Google).
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  palette text[] := array['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6'];
begin
  insert into public.profiles (id, email, display_name, avatar_color)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    palette[1 + floor(random() * array_length(palette, 1))::int]
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- The WebSocket/REST backend uses the service role (bypasses RLS), but the
-- browser talks to Supabase directly for auth + profiles, so we lock the
-- tables down to the owning user.
-- ============================================================================

alter table public.profiles               enable row level security;
alter table public.documents              enable row level security;
alter table public.document_collaborators enable row level security;
alter table public.document_snapshots     enable row level security;

-- profiles: a user can read any profile (needed to show collaborator names)
-- but only edit their own.
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles
  for select using (true);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

-- documents: visible to owner or any collaborator.
drop policy if exists "documents visible to members" on public.documents;
create policy "documents visible to members" on public.documents
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.document_collaborators c
      where c.document_id = id and c.user_id = auth.uid()
    )
  );

drop policy if exists "documents insert own" on public.documents;
create policy "documents insert own" on public.documents
  for insert with check (owner_id = auth.uid());

drop policy if exists "documents update member" on public.documents;
create policy "documents update member" on public.documents
  for update using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.document_collaborators c
      where c.document_id = id and c.user_id = auth.uid()
    )
  );

drop policy if exists "documents delete owner" on public.documents;
create policy "documents delete owner" on public.documents
  for delete using (owner_id = auth.uid());

-- collaborators: you can see membership for documents you belong to, and add
-- yourself to a document (join).
drop policy if exists "collaborators visible" on public.document_collaborators;
create policy "collaborators visible" on public.document_collaborators
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.documents d
      where d.id = document_id and d.owner_id = auth.uid()
    )
  );

drop policy if exists "collaborators self join" on public.document_collaborators;
create policy "collaborators self join" on public.document_collaborators
  for insert with check (user_id = auth.uid());

-- snapshots: readable by document members (writes happen via service role).
drop policy if exists "snapshots visible to members" on public.document_snapshots;
create policy "snapshots visible to members" on public.document_snapshots
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
