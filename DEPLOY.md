# Deployment guide

This app is **two services**, so it deploys to **two places**:

| Service | Host | Notes |
|--------|------|-------|
| `web/` (Next.js frontend) | **Vercel** | Standard Next.js deploy |
| `server/` (WebSocket + REST backend) | **Render** (or Railway / Fly) | Must support long-running WebSocket servers — **not** Vercel serverless |

Order matters: **deploy the backend first** so you know its URL, then point the frontend at it.

---

## 1. Backend → Render

1. Push this repo to GitHub (done).
2. Go to https://dashboard.render.com → **New → Blueprint** → select this repo.
   Render reads [`render.yaml`](render.yaml) and creates the `collab-editor-server` web service.
3. In the service's **Environment** tab, set:
   | Key | Value |
   |-----|-------|
   | `SUPABASE_URL` | `https://xwalgawafaimjmhyrzgb.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | your `sb_secret_…` key |
   | `SUPABASE_STORAGE_BUCKET` | `documents` |
   | `CORS_ORIGINS` | your Vercel URL (fill in after step 2) — e.g. `https://your-app.vercel.app` |
4. Deploy. Note the public URL, e.g. `https://collab-editor-server.onrender.com`.
5. Sanity check: open `https://collab-editor-server.onrender.com/health` → should return `{"status":"ok"}`.

> Free Render instances sleep when idle and cold-start on the next request; the
> client auto-reconnects, so collaboration resumes on its own.

---

## 2. Frontend → Vercel

1. https://vercel.com → **Add New → Project** → import this repo.
2. **Root Directory:** set to `web`.
3. **Environment Variables:**
   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xwalgawafaimjmhyrzgb.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your `sb_publishable_…` key |
   | `NEXT_PUBLIC_API_URL` | `https://collab-editor-server.onrender.com` |
   | `NEXT_PUBLIC_WS_URL` | `wss://collab-editor-server.onrender.com/doc` |
4. Deploy. Note the URL, e.g. `https://your-app.vercel.app`.

> ⚠️ **Use `wss://` (not `ws://`)** for `NEXT_PUBLIC_WS_URL` — the site is served
> over HTTPS, and browsers block insecure `ws://` from an HTTPS page. Render
> terminates TLS for you, so `wss://…/doc` just works.

---

## 3. Wire the two together

1. Back in **Render**, set `CORS_ORIGINS` to your Vercel URL and redeploy.
2. In **Supabase → Authentication → URL Configuration**:
   - **Site URL:** `https://your-app.vercel.app`
   - **Redirect URLs:** add `https://your-app.vercel.app/auth/callback`
     (keep the localhost entries for local dev).
3. In **Google Cloud Console** → your OAuth client → **Authorized JavaScript
   origins**: add `https://your-app.vercel.app`. (The redirect URI stays the
   Supabase callback — no change.)

---

## 4. Verify

- Open the Vercel URL → sign in (email or Google).
- Create a document, open it in two browsers → live sync + cursors.
- Confirm the connection pill shows **Live** (means the `wss://` backend
  connection is up). If it's stuck on "Connecting…", re-check
  `NEXT_PUBLIC_WS_URL` (must be `wss://…/doc`) and `CORS_ORIGINS`.

---

## Production checklist

- [ ] Backend env vars set on Render; `/health` returns ok
- [ ] Frontend env vars set on Vercel (`wss://` for the WS URL)
- [ ] `CORS_ORIGINS` includes the Vercel URL
- [ ] Supabase Site URL + redirect URLs include the Vercel URL
- [ ] Google JavaScript origins include the Vercel URL
- [ ] (Recommended) Disable "Confirm email" OR keep it on and rely on Google +
      a real SMTP provider for production email
