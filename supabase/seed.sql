-- ============================================================
-- NCF-Gradeschool-Voting — sample/demo data
-- Optional. Paste into the Supabase SQL Editor and run once, after
-- schema.sql, to see every admin page populated with realistic
-- content: an ongoing election, a full ballot, a student masterlist,
-- live voting codes, cast votes, and audit log entries.
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
  v_student_pending1 uuid;
  v_student_pending2 uuid;
  v_student_pending3 uuid;
  v_student_pending4 uuid;
  v_student_pending5 uuid;
  v_student_voted1 uuid;
  v_student_voted2 uuid;
  v_student_voted3 uuid;
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

  -- ---------- Students ----------
  insert into public.students (lrn, full_name, grade_level, section, status) values
    ('12-10001', 'Juan Bautista', 'Grade 6', 'Rizal', 'pending') returning id into v_student_pending1;
  insert into public.students (lrn, full_name, grade_level, section, status) values
    ('12-10002', 'Liza Cruz', 'Grade 6', 'Rizal', 'pending') returning id into v_student_pending2;
  insert into public.students (lrn, full_name, grade_level, section, status) values
    ('12-10003', 'Mark Villanueva', 'Grade 6', 'Rizal', 'voted') returning id into v_student_voted1;
  insert into public.students (lrn, full_name, grade_level, section, status) values
    ('12-10004', 'Nina Ramos', 'Grade 6', 'Bonifacio', 'pending') returning id into v_student_pending3;
  insert into public.students (lrn, full_name, grade_level, section, status) values
    ('12-10005', 'Paolo Garcia', 'Grade 6', 'Bonifacio', 'voted') returning id into v_student_voted2;
  insert into public.students (lrn, full_name, grade_level, section, status) values
    ('12-10006', 'Kaye Fernandez', 'Grade 6', 'Bonifacio', 'pending') returning id into v_student_pending4;
  insert into public.students (lrn, full_name, grade_level, section, status) values
    ('12-10007', 'Rico Aquino', 'Grade 5', 'Mabini', 'voted') returning id into v_student_voted3;
  insert into public.students (lrn, full_name, grade_level, section, status) values
    ('12-10008', 'Sofia Del Rosario', 'Grade 5', 'Mabini', 'pending') returning id into v_student_pending5;

  -- ---------- Voting codes: active for the pending students ----------
  insert into public.voting_codes (student_id, election_id, code, expires_at, is_used) values
    (v_student_pending1, v_election_id, 'K3F9M', now() + interval '10 minutes', false),
    (v_student_pending2, v_election_id, 'P7R2T', now() + interval '10 minutes', false),
    (v_student_pending3, v_election_id, 'X8N4Q', now() + interval '10 minutes', false),
    (v_student_pending4, v_election_id, 'W2Y6H', now() + interval '10 minutes', false),
    (v_student_pending5, v_election_id, 'B5C9J', now() + interval '10 minutes', false);

  -- ---------- Voting codes: already used, for the voted students ----------
  insert into public.voting_codes (student_id, election_id, code, expires_at, is_used) values
    (v_student_voted1, v_election_id, 'A1D3E', now() - interval '2 hours', true),
    (v_student_voted2, v_election_id, 'F4G7H', now() - interval '90 minutes', true),
    (v_student_voted3, v_election_id, 'L9M2N', now() - interval '40 minutes', true);

  -- ---------- Votes cast by the 3 "voted" students (anonymous — no student link) ----------
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
    ('admin@ncf.edu.ph (admin)', 'Students imported', jsonb_build_object('count', 8)),
    ('admin@ncf.edu.ph (admin)', 'Bulk codes generated', jsonb_build_object('grade_level', 'Grade 6', 'section', 'Rizal', 'count', 2, 'minutes', 10)),
    ('admin@ncf.edu.ph (admin)', 'Bulk codes generated', jsonb_build_object('grade_level', 'Grade 6', 'section', 'Bonifacio', 'count', 2, 'minutes', 10)),
    ('admin@ncf.edu.ph (admin)', 'Election status → ongoing', jsonb_build_object('election_id', v_election_id));
end $$;

-- ============================================================
-- CLEANUP: when you're ready to start fresh with real data,
-- run supabase/reset-sample-data.sql instead of deleting rows
-- by hand here — it clears everything this file created
-- (elections, students, audit logs) without touching your
-- staff accounts.
-- ============================================================
