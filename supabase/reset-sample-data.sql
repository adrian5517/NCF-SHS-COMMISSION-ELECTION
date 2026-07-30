-- ============================================================
-- NCF-SHS-COMMISSION-ON-ELECTIONS — reset sample/mock data
-- Run this in the Supabase SQL Editor when you're done testing
-- and ready to start fresh with your real students and election.
--
-- What this DOES delete:
--   - All elections (cascades to positions, candidates, voting
--     codes, and votes automatically via foreign keys)
--   - All students (cascades to their voting codes too)
--   - All audit log entries
--
-- What this does NOT touch:
--   - Your staff accounts (admin@ncf.edu.ph, watcher@ncf.edu.ph,
--     or any other auth.users / profiles rows) — those are real
--     accounts, not sample data, and are left alone.
--
-- This cannot be undone. Double-check you're on the right
-- Supabase project before running it.
-- ============================================================

delete from public.elections;
delete from public.students;
delete from public.audit_logs;

-- ============================================================
-- After running this:
-- 1. Admin → Students → Import CSV with your real masterlist.
-- 2. Admin → Elections → create your real election.
-- 3. Admin → Positions & Candidates → build the real ballot.
-- ============================================================
