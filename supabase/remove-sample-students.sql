-- ============================================================
-- Remove sample/mock STUDENTS only.
-- Run this in the Supabase SQL Editor for your project.
--
-- Deletes every row in public.students, which cascades to their
-- voting_codes. It does NOT touch:
--   - candidates or positions (your official ballot)
--   - elections
--   - votes (anonymous — no student link)
--   - staff accounts (auth.users / profiles)
--
-- After this, import your real masterlist via Admin → Students (CSV)
-- using the 12-##### Student ID format.
-- This cannot be undone — confirm you're on the right project first.
-- ============================================================

delete from public.students;
