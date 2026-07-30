-- ============================================================
-- NCF-SHS-COMMISSION-ON-ELECTIONS — full election seeder
-- Creates the election (if none exists) and adds BOTH parties'
-- candidates to the SAME positions in one pass, so there's no
-- chance of duplicate positions from running separate scripts.
--
-- Paste into the Supabase SQL Editor and run once.
-- Safe to re-run: skips the election, position, or candidate if
-- it already exists.
-- ============================================================

do $$
declare
  v_election_id uuid;
  v_pos_id uuid;
begin
  -- ---------- election ----------
  select id into v_election_id
  from public.elections
  where status in ('ongoing', 'upcoming', 'draft')
  order by case status when 'ongoing' then 0 when 'upcoming' then 1 else 2 end, created_at desc
  limit 1;

  if v_election_id is null then
    insert into public.elections (title, description, start_date, end_date, status)
    values (
      'SSG Election',
      'Supreme Student Government election.',
      now(),
      now() + interval '7 days',
      'ongoing'
    )
    returning id into v_election_id;
    raise notice 'Created election %', v_election_id;
  end if;

  -- ---------- President ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'President';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'President', 1, 1) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Faith Amber P. Vasquez') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Faith Amber P. Vasquez', 'Grade 6', 'Androcles', 'Lead Party', '#7c3aed', 1);
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Angel Janiela R. Lumabi') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Angel Janiela R. Lumabi', 'Grade 6', 'Alexander', 'Yes Party', '#2563eb', 2);
  end if;

  -- ---------- Vice President ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Vice President';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Vice President', 1, 2) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Althea Bless R. Mendoza') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Althea Bless R. Mendoza', 'Grade 5', 'Zachary', 'Lead Party', '#7c3aed', 1);
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Gian Franco B. Arendaing') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Gian Franco B. Arendaing', 'Grade 5', 'Anselm', 'Yes Party', '#2563eb', 2);
  end if;

  -- ---------- Secretary ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Secretary';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Secretary', 1, 3) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Heart Daniela R. Lumabi') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Heart Daniela R. Lumabi', 'Grade 6', 'Alexander', 'Lead Party', '#7c3aed', 1);
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Ayesha Sarah Magistrado') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Ayesha Sarah Magistrado', 'Grade 6', 'Androcles', 'Yes Party', '#2563eb', 2);
  end if;

  -- ---------- Budget and Finance ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Budget and Finance';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Budget and Finance', 1, 4) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Maurische Francine Priela') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Maurische Francine Priela', 'Grade 6', 'Androcles', 'Lead Party', '#7c3aed', 1);
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Shandrix M. Reyes') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Shandrix M. Reyes', 'Grade 6', 'Alexander', 'Yes Party', '#2563eb', 2);
  end if;

  -- ---------- Public Relation Officer ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Public Relation Officer';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Public Relation Officer', 1, 5) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Aya Kaitlyn V. Rosales') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Aya Kaitlyn V. Rosales', 'Grade 6', 'Alexander', 'Lead Party', '#7c3aed', 1);
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Mary Dyane R. Rentoy') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Mary Dyane R. Rentoy', 'Grade 6', 'Androcles', 'Yes Party', '#2563eb', 2);
  end if;

  -- ---------- Grade 1 Representative ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Grade 1 Representative';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Grade 1 Representative', 1, 6) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Louise Marxhean M. Bazar') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Louise Marxhean M. Bazar', 'Grade 1', 'Nicholas', 'Lead Party', '#7c3aed', 1);
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Francelle G. Barrameda') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Francelle G. Barrameda', 'Grade 1', 'Ashbel', 'Yes Party', '#2563eb', 2);
  end if;

  -- ---------- Grade 2 Representative ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Grade 2 Representative';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Grade 2 Representative', 1, 7) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Mazikeen Denise T. Blincow') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Mazikeen Denise T. Blincow', 'Grade 2', 'Jeremiel', 'Lead Party', '#7c3aed', 1);
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Savannah Eve Hemady') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Savannah Eve Hemady', 'Grade 2', 'Timothy', 'Yes Party', '#2563eb', 2);
  end if;

  -- ---------- Grade 3 Representative ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Grade 3 Representative';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Grade 3 Representative', 1, 8) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Pieter Jusefh B. Atienza') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Pieter Jusefh B. Atienza', 'Grade 3', 'Eran', 'Lead Party', '#7c3aed', 1);
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Janzlyn Faith A. Tiaba') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Janzlyn Faith A. Tiaba', 'Grade 3', 'Clovis', 'Yes Party', '#2563eb', 2);
  end if;

  -- ---------- Grade 4 Representative ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Grade 4 Representative';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Grade 4 Representative', 1, 9) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Hanna Callie V. Serrano') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Hanna Callie V. Serrano', 'Grade 4', 'Clement', 'Lead Party', '#7c3aed', 1);
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Johanna T. Dialogo') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Johanna T. Dialogo', 'Grade 4', 'Magnus', 'Yes Party', '#2563eb', 2);
  end if;

  -- ---------- Grade 5 Representative ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Grade 5 Representative';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Grade 5 Representative', 1, 10) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Lawrence Euan M. Lorico') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Lawrence Euan M. Lorico', 'Grade 5', 'Anselm', 'Lead Party', '#7c3aed', 1);
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Athena Guevarra') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Athena Guevarra', 'Grade 5', 'Zachary', 'Yes Party', '#2563eb', 2);
  end if;

  -- ---------- Grade 6 Representative ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Grade 6 Representative';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Grade 6 Representative', 1, 11) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Alleiah Athena Nogot') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Alleiah Athena Nogot', 'Grade 6', 'Alexander', 'Lead Party', '#7c3aed', 1);
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Kenjie Tiaba') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Kenjie Tiaba', 'Grade 6', 'Androcles', 'Yes Party', '#2563eb', 2);
  end if;

  raise notice 'Election % seeded with both parties.', v_election_id;
end $$;
