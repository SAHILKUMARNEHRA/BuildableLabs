# CoWrite — Interview Study Guide (English + Hindi)

A complete, easy-language guide to explain your project in the interview.
For each thing: **What it is → Why I used it → How it works → Where it's used.**

> Tip: speak slowly, draw the flow diagram (bottom of this file), and always
> connect a choice to a *reason* ("I chose X **because** Y").

---

## 0. One-line pitch (yaad kar lo)

**English:** "CoWrite is a real-time collaborative document editor — like Google
Docs. Multiple people edit the same document at once, they see each other's
cursors and changes instantly, it works offline, and every edit is saved with
who made it."

**Hindi:** "CoWrite ek real-time collaborative document editor hai — Google Docs
jaisa. Ek hi document ko kai log ek saath edit kar sakte hain, ek dusre ka
cursor aur changes turant dikhte hain, offline bhi chalta hai, aur har edit
save hoti hai ki kisne ki."

---

## 1. The big architecture (poora system kaise juda hai)

There are **3 main parts**:

1. **Frontend (Next.js)** — what the user sees in the browser.
2. **Backend (Node + custom WebSocket server)** — the real-time engine that
   passes edits between users and saves them.
3. **Supabase** — database + login + file storage (the "cloud" part).

**Hindi:** Teen hisse hain — (1) Frontend jo browser me dikhta hai, (2) Backend
jo real-time edits sab users ke beech bhejta hai aur save karta hai, (3) Supabase
jo database, login aur file storage deta hai.

---

## 2. Frontend

### 2.1 Next.js (React framework)
- **What:** A framework built on React to make websites with pages, routing,
  and fast loading.
- **Why:** The assignment allowed React or Next.js. I picked Next.js because it
  gives routing, a build system, and great performance out of the box — less
  setup, more focus on features.
- **How:** Pages live in the `app/` folder (`/login`, `/documents`,
  `/documents/[id]`). Each URL = one file.
- **Hindi:** Next.js React ke upar bana framework hai. Routing, build, speed sab
  ready milta hai, isliye time bachta hai aur main features pe focus kar paaya.

### 2.2 TypeScript
- **What:** JavaScript + types (you declare what kind of data a variable holds).
- **Why:** Catches bugs *before* running — e.g. if I pass a wrong value, it
  warns me. Makes big code safe and readable.
- **Hindi:** JavaScript me types add karta hai, jisse galtiyan code chalane se
  pehle hi pakdi jaati hain. Bade project me bahut safe rehta hai.

### 2.3 Tailwind CSS
- **What:** A CSS tool where you style using small classes (`flex`, `p-4`,
  `rounded-xl`) directly in the HTML.
- **Why:** Fast to build a consistent, modern UI — I used it for the Apple-style
  "liquid glass" look (frosted, transparent panels).
- **Hindi:** Chhoti-chhoti class lagakar design banate hain. Tezi se sundar UI
  banta hai — maine Apple jaisa glass effect isi se banaya.

### 2.4 TipTap (the editor)
- **What:** A rich-text editor library (built on ProseMirror) — gives bold,
  headings, lists, links, etc.
- **Why:** Writing a text editor from scratch is very hard. TipTap is reliable
  and, most importantly, has **official support for real-time collaboration**
  (it connects to Yjs).
- **How:** TipTap shows the document and turns every keystroke into a small
  "change" that Yjs syncs to everyone.
- **Hindi:** Editor banana bahut mushkil hai, TipTap ready-made deta hai. Sabse
  badi baat — ye real-time collaboration (Yjs) ke saath kaam karta hai.

---

## 3. Real-time + conflict resolution (★ THE most important part)

> This is what the interviewer will dig into the most. Master this section.

### 3.1 The problem
If two people type at the **same spot at the same time**, whose change wins?
A naive app overwrites one person's text ("last write wins") → data loss.

**Hindi:** Do log ek hi jagah ek saath likhein to kiska change rahega? Galat
tarike se ek banda ka text mit jaata hai.

### 3.2 My solution: CRDT (using Yjs)
- **What:** CRDT = **Conflict-free Replicated Data Type**. A special data
  structure where everyone's edits **automatically merge** correctly, no matter
  what order they arrive in. Yjs is a popular CRDT library.
- **Why I chose CRDT over OT (Operational Transform):**
  - OT (what older Google Docs used) needs a central server to carefully
    "transform" every operation in order. It's powerful but **very hard to get
    right** — small bugs cause documents to silently go out of sync.
  - CRDT **guarantees** that any two copies that received the same edits end up
    identical — merges are automatic. Perfect for **offline + real-time**.
- **How it works (simple):** Each character gets a unique hidden ID. When two
  people insert text, the IDs decide a consistent order on *every* device — so
  all copies agree, no overwrite.
- **Hindi:** CRDT ek smart data structure hai jisme sabke edits apne aap sahi
  tarike se mil jaate hain — chahe kisi bhi order me aayein. Maine OT ki jagah
  CRDT chuna kyunki OT likhna bahut mushkil aur buggy hota hai, jabki CRDT
  guarantee deta hai ki sabke document same rahenge. Har character ko ek hidden
  ID milti hai jisse order fix ho jaata hai.

**If asked "why not Supabase Realtime?":** The assignment *required* a custom
WebSocket backend. Also, building it myself shows I understand the protocol.

### 3.3 Custom WebSocket backend
- **What:** WebSocket = a 2-way live connection between browser and server
  (unlike normal HTTP which is one request → one response). I wrote my own
  WebSocket server in Node.js using the `ws` library.
- **Why:** Real-time editing needs the server to *push* other people's changes
  to you instantly. HTTP can't do that well; WebSocket can. Assignment required
  a **custom** one (not Supabase's built-in).
- **How:** Each open document = a "room" on the server. When you type, your
  change goes to the server; the server broadcasts it to everyone else in that
  room. The server also keeps the official copy and saves it.
- **Hindi:** WebSocket browser aur server ke beech ek live 2-way line hai.
  Normal HTTP ek baar maang, ek baar jawab — par real-time me server ko khud
  push karna padta hai, wo WebSocket karta hai. Maine `ws` library se apna server
  banaya. Har document ek "room" hai; aap type karo to server sabko bhej deta hai.

### 3.4 Yjs awareness (presence + cursors)
- **What:** "Awareness" is a side-channel on the same connection that shares
  *temporary* info: who is online, their name/color, and cursor position.
- **Why:** To show "Alice is editing" and the colored cursors.
- **Hindi:** Awareness ek extra channel hai jo batata hai kaun online hai, naam,
  color, aur cursor kahan hai — isi se "Alice is editing" aur colored cursor
  dikhte hain.

---

## 4. Supabase (database + auth + storage)

- **What:** Supabase is a "backend-as-a-service" — gives a Postgres database,
  user login (auth), and file storage, all ready to use.
- **Why:** The assignment required it. It saves huge time — I didn't have to
  build login, password security, or a database server myself.

### 4.1 Auth (login/signup + Google)
- **How:** Supabase handles email/password and Google login. After login it
  gives a **token** (a signed ID card). My backend checks this token on every
  request and WebSocket connection to confirm who you are.
- **Extra I did:** I route signup through my backend so accounts are created
  already-confirmed (no confirmation email, no email rate limit).
- **Hindi:** Supabase login sambhalta hai. Login ke baad ek token (ID card)
  milta hai; mera backend har request pe ye token check karta hai ki aap kaun ho.

### 4.2 Database (Postgres)
- **Tables:** `documents` (title, owner), `document_collaborators` (who joined),
  `document_snapshots` (version history), `profiles` (name + color).
- **RLS (Row Level Security):** Database rules so a user can only see their own
  documents. Security at the database level.
- **Hindi:** Postgres database me tables hain — documents, collaborators,
  history, profiles. RLS rules se har user sirf apne documents dekh paata hai.

### 4.3 Storage
- **What:** Supabase Storage stores files. I use it for two things:
  (1) the document's saved binary state, (2) images uploaded into the editor.
- **Hindi:** Storage me files rakhte hain — document ka saved data aur editor me
  upload ki gayi images.

---

## 5. Offline support
- **What/How:** The browser keeps a local copy in **IndexedDB** (browser's
  database). If your internet drops, you keep typing into the local copy. When
  internet returns, Yjs syncs the missing changes automatically.
- **Why it works smoothly:** Because it's a CRDT, offline edits merge cleanly
  with whatever others did — no conflicts.
- **Hindi:** Browser IndexedDB me local copy rakhta hai. Net jaaye to bhi aap
  likhte raho; net aate hi Yjs apne aap sab sync kar deta hai. CRDT hone ki wajah
  se koi conflict nahi hota.

---

## 6. Polish features (chhote but important)

- **Undo/Redo:** Yjs has a collaboration-aware undo — you only undo *your own*
  changes, not your teammates'.
- **Version history:** Server saves a snapshot every ~30s and on close. Each
  version shows **who edited** and a **diff** (green = added text, red =
  removed) by comparing consecutive versions.
- **Presence bar:** Avatars + "Alice and Bob are editing".
- **Hindi:** Undo sirf aapke apne changes hatata hai. History har 30 second me
  snapshot leti hai — kisne edit kiya aur kya add/remove hua wo green/red me
  dikhta hai.

---

## 7. Deployment (kahan chal raha hai)
- **Frontend → Vercel** (best for Next.js).
- **Backend → Render** (supports long-running WebSocket servers; Vercel's
  serverless can't hold a live socket open).
- **Why split:** A WebSocket server must stay running and hold connections;
  serverless functions shut down between requests, so they can't.
- **Hindi:** Frontend Vercel pe, backend Render pe. WebSocket server ko hamesha
  chalte rehna padta hai (connections pakad ke), isliye serverless (Vercel) pe
  nahi chal sakta — Render pe daala.

---

## 8. Likely interview questions + short answers

**Q: Why CRDT and not OT?**
A: CRDT auto-merges and is provably consistent; OT needs complex server-side
transforms that are hard to get right. CRDT also handles offline naturally.

**Q: What happens on a conflict?**
A: There's no "conflict" to resolve manually — the CRDT orders edits by hidden
IDs so every device converges to the same result. No data is lost.

**Q: Why a custom WebSocket and not Supabase Realtime?**
A: It was required, and it let me own the sync + presence protocol and persist
documents exactly how I wanted.

**Q: How do you secure it?**
A: Supabase JWT token verified on every REST call and on the WebSocket upgrade;
access check (owner/collaborator) before joining a room; Postgres RLS on tables.

**Q: How does it scale?**
A: Right now one server holds the live doc in memory. To scale to many servers
I'd add Redis pub/sub so all servers share a room's updates. (Good thing to
mention — shows you think ahead.)

**Q: What was the hardest part?**
A: Getting the custom WebSocket server to correctly speak the Yjs sync +
awareness protocol and persist to Supabase without losing updates.

---

## 9. The data flow — draw this on paper

```
   You type "H"
       │
       ▼
  TipTap editor ──> Yjs makes a tiny CRDT update
       │
       ▼  (WebSocket)
  Custom Node server (the "room" for this document)
       │  ├─ broadcasts the update ──> all other users' editors (instant)
       │  └─ saves to Supabase (Storage = state, Postgres = info, snapshots = history)
       ▼
  Everyone's document now shows "H"   ✅ same on every screen
```

Also: a copy is saved in the browser's IndexedDB → works offline → syncs on
reconnect.

---

## 10. 30-second summary to open the interview

"I built CoWrite, a real-time collaborative editor. The frontend is Next.js with
TipTap for editing. Real-time sync runs over a custom WebSocket server I wrote in
Node, and I used CRDTs via Yjs for conflict resolution — so concurrent edits
merge automatically with no data loss, and it even works offline. Supabase
handles auth, the Postgres database, and file storage. It's deployed with the
frontend on Vercel and the WebSocket backend on Render."
```
```
