# Fluid — Real-time Collaborative Document Editor

A real-time document editor where multiple people can write in the same
document at once. Edits appear instantly for everyone, every keystroke is
conflict-free, presence and cursors are live, the document persists, and it
keeps working offline.

Built for the BuildableLabs Full-Stack Engineer assignment.

> **Setup in 15 minutes:** follow **[SETUP.md](SETUP.md)** for click-by-click
> Supabase + Google OAuth + run instructions.
> **Deploying?** See **[DEPLOY.md](DEPLOY.md)** (Vercel + Render).

---

## ✨ Highlights

- **Real-time multi-user editing** over a **custom WebSocket backend** (no
  Supabase Realtime).
- **Conflict-free merging** using CRDTs (Yjs) — concurrent edits never clobber
  each other, no locks, no last-write-wins data loss.
- **Live presence & cursors** — coloured carets with names, plus an
  "_Alice is editing_" presence bar.
- **Offline-first** — edits made offline are cached locally (IndexedDB) and
  sync automatically on reconnect.
- **Undo/redo** that respects collaboration (you only undo your own edits).
- **Version history** — the server snapshots the document over time.
- **Email/password + Google** auth via Supabase, with **specific, friendly
  error messages** for every failure case.
- **Apple "Liquid Glass" UI** — frosted translucent surfaces, soft gradients,
  floating light, subtle motion.
- **Rich editing** — bubble menu on selection, links, checklists, image upload
  to Supabase Storage, word count, live save status, focus mode, and one-click
  **export to Markdown**.
- **Document management** — create, rename, delete, search, and share by link.

---

## 🧱 Tech stack

| Layer | Choice |
|------|--------|
| Frontend | **Next.js 14 (App Router) + TypeScript + Tailwind CSS** |
| Editor | **TipTap** (ProseMirror) with Yjs bindings |
| Realtime backend | **Node.js + Express + `ws`** — a hand-written Yjs sync + awareness relay |
| Conflict resolution | **Yjs CRDT** |
| Database / Auth | **Supabase** (Postgres + Auth, email/password + Google OAuth) |
| File storage | **Supabase Storage** (binary document snapshots) |
| Offline cache | **y-indexeddb** |

This maps directly onto the assignment's required stack: React/Next, Node
(Express) backend, Supabase DB, **custom WebSocket realtime**, Supabase Storage.

---

## 🗂 Project structure

A deliberately flat, readable layout — one responsibility per file.

```
.
├── server/                     # Custom realtime + REST backend
│   └── src/
│       ├── index.js            # HTTP + WebSocket entry point
│       ├── config/             # env loading, Supabase client
│       ├── auth/               # access-token verification + middleware
│       ├── ws/                 # the WebSocket server
│       │   ├── server.js       #   auth on upgrade, connection lifecycle
│       │   ├── room.js         #   one Room per document: doc + presence + saves
│       │   └── syncProtocol.js #   the binary Yjs sync/awareness wire protocol
│       ├── persistence/        # load/save documents + access control
│       └── routes/             # REST: list/create/join/rename/history
│
├── web/                        # Next.js frontend
│   ├── app/                    # routes: /login /signup /documents /documents/[id]
│   ├── components/
│   │   ├── auth/               # auth form, Google button
│   │   ├── documents/          # dashboard cards + actions
│   │   ├── editor/             # editor, toolbar, presence, status, history
│   │   ├── layout/             # app header
│   │   └── ui/                 # glass primitives + toasts
│   └── lib/
│       ├── auth/               # AuthProvider + friendly error mapping
│       ├── collab/             # the Yjs + WebSocket + offline hook
│       ├── supabase/           # browser client
│       └── api.ts              # typed REST client
│
└── supabase/
    └── schema.sql              # tables, RLS policies, profile trigger
```

---

## 🔧 How it works

### Real-time sync & conflict resolution (my approach)

The hard part of a collaborative editor is what happens when two people edit the
**same place at the same time**. I chose a **CRDT (Conflict-free Replicated Data
Type)** via **Yjs** rather than Operational Transform.

**Why CRDT over OT?**
- OT requires a central server to transform and order every operation; bugs in
  the transform functions cause silent divergence. It's notoriously hard to get
  right.
- A CRDT guarantees that any two replicas that have seen the same set of edits
  converge to the **same document**, regardless of order. Merges are automatic
  and commutative — ideal for an offline-capable, lag-free editor.

**The flow:**
1. Each browser holds a `Y.Doc`. TipTap renders it and turns every keystroke
   into a small CRDT update.
2. Updates go over a WebSocket to my **custom backend** (`server/src/ws`). The
   server keeps an authoritative `Y.Doc` per open document (a "Room") and
   **broadcasts** each update to all other clients in that room.
3. The wire format is the standard Yjs sync + awareness protocol, which I
   implemented by hand in [`syncProtocol.js`](server/src/ws/syncProtocol.js) on
   top of `ws` — **not** Supabase Realtime.
4. Because everything is a CRDT update, late joiners, reconnects, and offline
   clients all converge automatically — no conflicts to resolve manually.

### Presence & cursors

Presence rides on the same socket via Yjs **awareness**. Each client publishes
its name, colour, and cursor selection; the server relays awareness changes to
the room. The UI turns this into coloured remote carets and the
"_Alice is editing_" bar.

### Persistence

- **Live state** is debounced and written to **Supabase Storage** as a compact
  binary blob (one object per document). On open, the Room loads it back.
- **Metadata** (title, owner, timestamps) lives in Postgres.
- **History** snapshots are appended to `document_snapshots` at most once a
  minute while editing, giving a browsable timeline.

### Offline support

The client wraps the `Y.Doc` with **IndexedDB persistence**, so the document
paints instantly from cache and edits made with no network are queued locally.
When the socket reconnects, Yjs exchanges only the missing updates and
everything merges. A status pill shows **Live / Reconnecting / Offline**.

### Auth & security

- Supabase handles email/password and Google OAuth (PKCE).
- The browser talks to Supabase directly; every call to my backend carries the
  Supabase **access token** as a Bearer header.
- The backend **verifies that token** on every REST request and on the
  WebSocket upgrade, then checks the user **owns or has joined** the document
  before letting them into the room.
- Postgres **Row-Level Security** locks every table down to the owning user.

### Error handling

Auth failures map to **specific** messages (see
[`lib/auth/errors.ts`](web/lib/auth/errors.ts)): already-registered email,
wrong password / unknown account, unconfirmed email, weak password, rate
limits, and network errors each get their own clear copy — surfaced both inline
and as a glassy toast.

---

## 🎯 Assignment coverage

**Core**
- [x] Login works (email/password via Supabase) — **plus Google OAuth**
- [x] Create / join documents
- [x] Single user can edit; changes persist
- [x] Refresh browser → changes still there

**Real-Time Sync**
- [x] Multiple users edit simultaneously
- [x] Changes broadcast in real time over a custom WebSocket backend
- [x] Conflict resolution (CRDT / Yjs — automatic, lossless)
- [x] Presence: "<name> is editing"

**Polish**
- [x] Cursor positions tracked (live coloured remote carets)
- [x] Offline support (IndexedDB + auto-sync on reconnect)
- [x] Undo / redo (collaboration-aware)
- [x] Document history (server snapshots + timeline panel)

---

## ▶️ Quick start

See **[SETUP.md](SETUP.md)** for the full guide. In short:

```bash
# 1. Configure Supabase + env files (see SETUP.md)

# 2. Backend
cd server && npm install && npm run dev

# 3. Frontend (new terminal)
cd web && npm install && npm run dev
# open http://localhost:3000
```

---

## ⚖️ Trade-offs & things I'd do next

- **CRDT vs OT:** CRDTs trade a little memory/metadata overhead for vastly
  simpler, provably-convergent merging — the right call for offline + realtime.
- **History is currently an audit timeline.** A natural next step is one-click
  *restore* of a past snapshot (rendering a read-only preview from the stored
  binary state before applying it).
- **Horizontal scaling:** today the authoritative `Y.Doc` lives in one server
  process. To run multiple backend instances I'd add a Redis pub/sub (or
  similar) so rooms are shared across nodes.
- **Auth hardening for production:** re-enable email confirmation and add token
  refresh on long-lived sockets.
