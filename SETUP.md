# Setup guide

This is the **complete, click-by-click setup** for running the collaborative
editor locally. It takes ~15 minutes. You only need a free Supabase account and
(optionally) a Google Cloud account for Google sign-in.

Everything you configure lives in two `.env` files — nothing is hard-coded.

---

## 0. What you need

| Tool | Version | Link |
|------|---------|------|
| Node.js | 18+ (tested on 22) | https://nodejs.org |
| A Supabase project (free) | — | https://supabase.com/dashboard |
| Google Cloud project (only for Google login) | — | https://console.cloud.google.com |

---

## 1. Create the Supabase project

1. Go to **https://supabase.com/dashboard** → **New project**.
2. Give it a name, set a database password, pick a region close to you, **Create**.
3. Wait ~2 minutes for it to provision.

### Grab your keys
Go to **Project Settings → API**. You will copy three values:

| Value | Where it goes |
|-------|----------------|
| **Project URL** (`https://xxxx.supabase.co`) | both `.env` files |
| **anon / public** key | frontend `.env.local` |
| **service_role** key (under "Project API keys", click *Reveal*) | backend `.env` — **server only, keep secret** |

> The `service_role` key bypasses security rules. It is only ever used by the
> backend. Never put it in the frontend.

---

## 2. Create the database tables

1. In the Supabase dashboard open **SQL Editor → New query**.
2. Open the file [`supabase/schema.sql`](supabase/schema.sql) from this repo,
   copy its entire contents, paste into the editor.
3. Click **Run**.

This creates the `profiles`, `documents`, `document_collaborators`, and
`document_snapshots` tables, a trigger that auto-creates a profile on signup,
and all the Row-Level-Security policies. It is safe to re-run.

---

## 3. Create the storage bucket

The binary document state is stored as files in Supabase Storage.

1. Dashboard → **Storage → New bucket**.
2. Name it exactly **`documents`**, leave it **Private** (the backend accesses
   it with the service key). **Create**.
3. Create a second bucket named exactly **`images`**, and make this one
   **Public** (embedded images need a public URL). **Create**.

> The `documents` bucket holds the binary document state; the `images` bucket
> holds images uploaded into the editor. If you rename `documents`, set
> `SUPABASE_STORAGE_BUCKET` in the backend `.env` to match.

---

## 4. (Optional) Enable Google sign-in

Skip this if you only want email/password — the app works fully without it.

### 4a. Create Google OAuth credentials
1. Go to **https://console.cloud.google.com** → create/select a project.
2. **APIs & Services → OAuth consent screen** → choose **External** → fill the
   minimal fields (app name, your email) → Save.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. Under **Authorized redirect URIs** add the callback URL Supabase gives you:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   (Find `<your-project-ref>` in your Supabase Project URL.)
6. **Create** → copy the **Client ID** and **Client secret**.

### 4b. Tell Supabase about it
1. Supabase dashboard → **Authentication → Providers → Google**.
2. Toggle **Enable**, paste the **Client ID** and **Client secret**, **Save**.

### 4c. Allow the local redirect
1. Supabase dashboard → **Authentication → URL Configuration**.
2. Set **Site URL** to `http://localhost:3000`.
3. Under **Redirect URLs** add `http://localhost:3000/auth/callback`.

> For email/password during local dev you may also want to **disable "Confirm
> email"** under *Authentication → Providers → Email* so you can sign in
> immediately without clicking a verification link. (Leave it on for production.)

---

## 5. Configure environment files

### Backend — `server/.env`
```bash
cp server/.env.example server/.env
```
Fill in:
```
PORT=4000
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your service_role key>
SUPABASE_STORAGE_BUCKET=documents
CORS_ORIGINS=http://localhost:3000
```

### Frontend — `web/.env.local`
```bash
cp web/.env.local.example web/.env.local
```
Fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000/doc
```

---

## 6. Install & run

Open **two terminals**.

**Terminal 1 — backend (REST + WebSocket):**
```bash
cd server
npm install
npm run dev
```
You should see `collab-editor server ready`.

**Terminal 2 — frontend:**
```bash
cd web
npm install
npm run dev
```
Open **http://localhost:3000**.

---

## 7. Try the real-time magic

1. Sign up with an email + password (or Google).
2. Click **New document** → start typing. Refresh the page → your text is still
   there (it persisted).
3. Click **Share** to copy the link.
4. Open the link in a **second browser / incognito window**, sign in as a
   different user, and **Join**.
5. Type in both windows — changes appear instantly in the other, each person
   gets a coloured cursor with their name, and the presence bar shows
   "<name> is editing".
6. Turn off Wi-Fi, keep typing, turn it back on — your offline edits sync.

---

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `Missing required environment variable` on backend start | You didn't fill `server/.env`. |
| Frontend: "Supabase env vars are missing" | Fill `web/.env.local` and restart `npm run dev`. |
| Stuck on "Connecting…" | Backend isn't running, or `NEXT_PUBLIC_WS_URL` is wrong. |
| Google button does nothing / redirect error | Re-check steps 4a–4c, especially the redirect URLs. |
| "row level security" errors in SQL | Make sure you ran the **whole** `schema.sql`. |
| Edits don't persist after refresh | Confirm the `documents` storage bucket exists and the service key is set. |
