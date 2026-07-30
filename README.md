# NCF-SHS-COMMISSION-ON-ELECTIONS

Futuristic grade-school digital election system for a computer-lab setup.
Next.js (App Router + Server Actions) · Supabase (Postgres, Auth, Storage, Realtime) · Tailwind CSS v4 · Recharts.

## Features

- **Admin** — elections, positions & candidates (photo upload with square-crop + compression), student masterlist (CSV import), live voting-code manager with countdowns and realtime status, live results, audit log, CSV/print export, emergency close.
- **Watcher** — read-only live turnout, results, and audit trail.
- **Students** — no accounts: LRN + short-lived voting code at the kiosk (`/vote`), step-by-step visual ballot, review & confirm, anonymous votes (no student_id ever stored with a vote), thank-you screen that auto-resets for the next voter, 60-second idle reset.
- **Projector mode** (`/projector`) — public big-screen turnout/results, auto-refreshing.

## Setup

1. **Supabase**: create a project at supabase.com, then open the SQL Editor and run the entire
   [`supabase/schema.sql`](supabase/schema.sql). It creates all tables, RLS policies, RPCs
   (including the atomic `submit_ballot` transaction), realtime publications, and the public
   `election-media` storage bucket.
2. **Staff accounts**: Authentication → Users → Add user (email + password) for each admin/watcher.
   A `profiles` row is created automatically with role `watcher`. Promote your admin:
   ```sql
   update public.profiles set role = 'admin' where id = '<that user's uuid>';
   ```
3. **Env vars**: copy `.env.example` to `.env.local` and fill in your Supabase URL, anon key,
   and a random `STUDENT_SESSION_SECRET`.
4. **Run**:
   ```bash
   pnpm install
   pnpm dev
   ```

## Election-day flow

1. Admin creates the election, positions, candidates → **Open** it (status `ongoing`).
2. Students masterlist imported via CSV (`lrn, full_name, grade_level, section`).
3. In the lab: Admin filters to the current **grade + section** on the Voting Codes page and
   clicks **Bulk generate codes** (pick the lifetime, e.g. 10 minutes). Print or project the list.
4. Students enter LRN + code at `/vote`, vote, and the booth resets itself.
5. Everyone watches turnout/results live (`/admin/results`, `/watch`, `/projector`).
6. Admin **Closes** the election → winners shown → **Export CSV** / **Print PDF**.

## Folder structure

```
supabase/schema.sql       DDL + RPCs + RLS + storage bucket
middleware.ts             route guards (staff areas + student ballot)
lib/
  supabase/               server/browser/middleware Supabase clients
  actions/                Server Actions (staff, elections, students, codes, vote)
  student-session.ts      signed JWT cookie for the kiosk session (jose)
  image.ts, upload.ts     client-side square-crop/compress + storage upload
hooks/use-realtime.ts     postgres_changes subscription hook
components/               live-results (charts), ballot-wizard, theme-toggle, …
app/
  page.tsx                landing
  login/                  staff sign-in
  admin/                  admin dashboard (elections, candidates, students, codes, results, audit)
  watch/                  watcher read-only dashboard
  vote/ + ballot/         student kiosk flow
  projector/              big-screen live display
```

## Security notes

- Votes are **anonymous**: the `votes` table has no `student_id`; marking the code used and the
  student as voted happens in the same DB transaction (`submit_ballot`, row-locked).
- Codes are single-use, expiring, generated server-side from an ambiguity-free alphabet.
- RLS: anon can only call whitelisted SECURITY DEFINER RPCs; staff read; only admins write.
- Kiosk session is a separate 15-minute HttpOnly JWT cookie, unrelated to staff auth.
- The student login endpoint is rate-limited (8 attempts/minute per IP+LRN).
