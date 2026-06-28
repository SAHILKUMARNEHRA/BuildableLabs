# Prompts & AI workflow

This document is my prompt-sharing submission for the BuildableLabs assignment.
I built the Collaborative Document Editor using **Claude Code** (Anthropic's
agentic CLI). Below are the prompts I gave, in order, and how I steered the
build — from scaffolding through deployment and polish.

My approach was to drive the architecture decisions myself (custom WebSocket
backend, CRDT-based conflict resolution, Supabase for auth/storage) and use the
AI to implement, verify, and debug against those decisions — reviewing every
step rather than accepting code blindly.

---

## 1. Kick-off — full build from the assignment brief
> Read the attached assignment PDF and build it: a lag-free real-time document
> editor where multiple users edit simultaneously. Keep the code professional
> and cleanly separated (don't cram auth and other concerns into one function —
> separate files, human-readable). Smooth UX. Handle errors with *specific*
> messages (email already registered, wrong password, user not registered, sign
> up first, etc.). Add **Google auth** as well. Tell me exactly what I need to
> set up (database, auth IDs, API keys) with links and steps. Make the UI
> best-in-class with an Apple "liquid glass" water/glass effect (screenshots
> attached). Build it directly without asking for permission.

## 2. Supabase configuration
> Here are my Supabase keys (publishable key, secret key, project URL). Add
> these to the env and wire everything up — the Supabase project is updated.

> done now run

## 3. Auth debugging
> "Too many attempts" — sign in and sign up both fail. Fix this. Also change the
> logo to a "b".

> same error again and again

(Diagnosed as Supabase's email-send rate limit caused by "Confirm email" being
on; unblocked by creating confirmed users via the admin API and improving the
error messaging.)

## 4. Enhancements
> enchance more

> enchance more

(Selected: UI/UX polish, more document features, and editor power features —
delete/rename/search, links, checklists, image upload to Supabase Storage, word
count, save status, focus mode, Markdown export, bubble menu, landing page.)

## 5. Ship to GitHub
> Here's my repo link — push the whole codebase. Do **not** add Claude as a
> contributor or co-author. I'll give you the Google key for Google auth.

(Stripped AI co-author trailers from history before pushing; verified the repo
shows only me as the contributor and no secrets were committed.)

## 6. Google OAuth
> Here's my Google Client ID and Client Secret. Tell me the exact "Authorized
> JavaScript origins" and "Authorized redirect URIs" to set, and confirm once
> it's enabled.

## 7. Deployment
> Tell me if it's ready to deploy. Give me the exact settings for the Render
> backend service, then the exact settings for the Vercel frontend.

> Backend is running at <render-url> — now give all the details for Vercel.

> The Vercel site is live but "Sign in with Google" redirects to localhost — fix
> this.

(Resolved via Supabase Site URL / redirect URLs and Render CORS configuration.)

## 8. Branding & final polish
> Rename the app from "Fluid" to a proper collaborative-document-editor name and
> make the logo match (document + pen). Polish the final finish — this is my
> submission.

## 9. Final QA against the brief
> The app works, but when 3 people edit at once the presence caption shows only
> one person while the avatars show all three — fix it. Re-verify everything
> against the assignment PDF: every part, the names, all of it.

(Fixed the presence caption to name all active editors; added a 3-client
automated test proving every client sees all collaborators; verified the full
production stack — auth → REST → `wss://` realtime — end to end.)

## 10. Toolbar refinement
> Make the editor toolbar buttons darker so they're clearly visible, and replace
> the vertical-looking undo/redo glyphs with professional horizontal icons.
> (Keep the bar light — only the button colours should be darker.)

---

## How I verified the work
- Automated sync test (`server/test/sync.test.mjs`): concurrent-edit
  convergence, presence, and late-joiner catch-up across 3 clients.
- Live end-to-end check against the deployed Supabase + Render + Vercel stack.
- Manual multi-browser testing of real-time editing, cursors, and offline sync.
