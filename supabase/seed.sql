-- ============================================================
-- NCF-Gradeschool-Voting — sample/demo data
-- Optional. Paste into the Supabase SQL Editor and run once, after
-- schema.sql, to see the results pages populated with realistic
-- content: an ongoing election, a full ballot, and cast votes.
--
-- Students are NOT seeded here — import your real masterlist via
-- Admin → Students (CSV) instead. Student IDs use the 12-##### format.
--
-- Safe to delete later — see the cleanup query at the bottom.
-- ============================================================

do $$
declare
  v_election_id uuid;
  v_pos_president uuid;
  v_pos_vp uuid;
  v_pos_councilor uuid;
  v_cand_juan uuid;
  v_cand_maria uuid;
  v_cand_pedro uuid;
  v_cand_ana uuid;
  v_cand_carlo uuid;
  v_cand_grace uuid;
  v_cand_miguel uuid;
begin
  -- ---------- Election ----------
  insert into public.elections (title, description, start_date, end_date, status)
  values (
    'SSG Election 2026',
    'Supreme Student Government election for school year 2026.',
    now() - interval '1 day',
    now() + interval '6 days',
    'ongoing'
  )
  returning id into v_election_id;

  -- ---------- Positions ----------
  insert into public.positions (election_id, position_name, max_votes, rank_order)
  values (v_election_id, 'President', 1, 1) returning id into v_pos_president;
  insert into public.positions (election_id, position_name, max_votes, rank_order)
  values (v_election_id, 'Vice President', 1, 2) returning id into v_pos_vp;
  insert into public.positions (election_id, position_name, max_votes, rank_order)
  values (v_election_id, 'Councilor', 2, 3) returning id into v_pos_councilor;

  -- ---------- Candidates ----------
  insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, motto, display_order)
  values (v_pos_president, 'Juan Dela Cruz', 'Grade 6', 'Rizal', 'Party Matatag', '#16a34a', 'Serve with heart.', 1)
  returning id into v_cand_juan;
  insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, motto, display_order)
  values (v_pos_president, 'Maria Santos', 'Grade 6', 'Bonifacio', 'Partido Malaya', '#d4a017', 'Together we rise.', 2)
  returning id into v_cand_maria;

  insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, motto, display_order)
  values (v_pos_vp, 'Pedro Reyes', 'Grade 6', 'Rizal', 'Party Matatag', '#16a34a', 'Ready to help.', 1)
  returning id into v_cand_pedro;
  insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, motto, display_order)
  values (v_pos_vp, 'Ana Lopez', 'Grade 6', 'Bonifacio', 'Partido Malaya', '#d4a017', 'Voice for all.', 2)
  returning id into v_cand_ana;

  insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, motto, display_order)
  values (v_pos_councilor, 'Carlo Mendoza', 'Grade 5', 'Mabini', 'Party Matatag', '#16a34a', 'Action, not words.', 1)
  returning id into v_cand_carlo;
  insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, motto, display_order)
  values (v_pos_councilor, 'Grace Tan', 'Grade 5', 'Mabini', 'Partido Malaya', '#d4a017', 'Kind and bold.', 2)
  returning id into v_cand_grace;
  insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, motto, display_order)
  values (v_pos_councilor, 'Miguel Torres', 'Grade 6', 'Rizal', 'Independent', '#6b7280', 'Fair for everyone.', 3)
  returning id into v_cand_miguel;

  -- ---------- Sample cast votes (anonymous — no student link) ----------
  insert into public.votes (election_id, position_id, candidate_id) values
    (v_election_id, v_pos_president, v_cand_juan),
    (v_election_id, v_pos_president, v_cand_juan),
    (v_election_id, v_pos_president, v_cand_maria),
    (v_election_id, v_pos_vp, v_cand_pedro),
    (v_election_id, v_pos_vp, v_cand_ana),
    (v_election_id, v_pos_vp, v_cand_ana),
    (v_election_id, v_pos_councilor, v_cand_carlo),
    (v_election_id, v_pos_councilor, v_cand_carlo),
    (v_election_id, v_pos_councilor, v_cand_carlo),
    (v_election_id, v_pos_councilor, v_cand_grace),
    (v_election_id, v_pos_councilor, v_cand_grace),
    (v_election_id, v_pos_councilor, v_cand_miguel);

  -- ---------- Audit log ----------
  insert into public.audit_logs (actor, action, details) values
    ('admin@ncf.edu.ph (admin)', 'Election created', jsonb_build_object('title', 'SSG Election 2026')),
    ('admin@ncf.edu.ph (admin)', 'Election status → ongoing', jsonb_build_object('election_id', v_election_id));
end $$;

-- ============================================================
-- CLEANUP: when you're ready to start fresh with real data,
-- run supabase/reset-sample-data.sql instead of deleting rows
-- by hand here — it clears everything this file created
-- (elections and audit logs) without touching your staff accounts.
-- To remove only sample students, run supabase/remove-sample-students.sql.
-- ============================================================
