-- ============================================================
-- NCF-SHS-COMMISSION-ON-ELECTIONS — reset votes and test data
-- Run this in the Supabase SQL Editor when you need to clear votes
-- and test data and start fresh with real students and election.
--
-- Deletes:
--   - All votes
--   - All abstentions
--   - All vote_tallies
--   - All abstention_tallies
--   - All voting_codes (cascade to students)
--   - Sets all students back to pending status (cascades to their voting_codes)
--
-- Note: This leaves your election structure (positions, candidates),
--       staff accounts (auth.users), and audit logs untouched.
-- ============================================================

delete from public.votes;
delete from public.abstentions;
delete from public.vote_tallies;
delete from public.abstention_tallies;
delete from public.voting_codes;
update public.students set status = 'pending';

-- ============================================================
-- After running this:
-- 1. Admin → Students → Import CSV with your real masterlist.
-- 2. Admin → Elections → create your real election.
-- 3. Admin → Positions & Candidates → build the real ballot.
-- ============================================================