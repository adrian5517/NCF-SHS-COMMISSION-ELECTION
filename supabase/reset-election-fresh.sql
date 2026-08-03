-- ============================================================
-- NCF-SHS-COMMISSION-ON-ELECTIONS — START THE ELECTION FRESH
-- Run this in the Supabase SQL Editor to zero out all voting
-- activity right before the real election begins.
--
-- What it CLEARS:
--   - every cast vote (public.votes)
--   - every abstention (public.abstentions)
--   - every voting code (public.voting_codes)
--   - resets every student back to 'pending'
--
-- What it KEEPS (untouched):
--   - your students (masterlist)
--   - your candidates, positions, and the election itself
--   - staff accounts
--
-- After this: tallies read 0, turnout reads 0/total, and you can
-- generate fresh codes and open voting. This cannot be undone.
-- ============================================================

delete from public.votes;
delete from public.abstentions;
delete from public.vote_tallies;
delete from public.abstention_tallies;
delete from public.voting_codes;
update public.students set status = 'pending';
