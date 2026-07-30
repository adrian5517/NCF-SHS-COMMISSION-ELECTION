-- ============================================================
-- NCF-SHS-COMMISSION-ON-ELECTIONS — "Yes Party" candidate slate
-- Paste into the Supabase SQL Editor and run once, after
-- seed-lead-party.sql (or any election with these positions
-- already set up).
--
-- Adds each Yes Party candidate to the SAME position Lead Party
-- already runs in (matched by position name), so every race ends
-- up with both parties' candidates on one ballot. If a position
-- doesn't exist yet in the target election, it's created so this
-- script also works standalone.
--
-- Safe to re-run: skips any candidate that already exists in
-- their position (matched by name), instead of inserting a
-- duplicate.
-- ============================================================

do $$
declare
  v_election_id uuid;
  v_party text := 'Yes Party';
  v_color text := '#2563eb';
  v_pos_id uuid;
begin
  select id into v_election_id
  from public.elections
  where status in ('ongoing', 'upcoming', 'draft')
  order by case status when 'ongoing' then 0 when 'upcoming' then 1 else 2 end, created_at desc
  limit 1;

  if v_election_id is null then
    raise exception 'No election found. Run seed-lead-party.sql first, or create an election in Admin → Elections.';
  end if;

  -- ---------- President ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'President';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'President', 1, 1) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Angel Janiela R. Lumabi') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Angel Janiela R. Lumabi', 'Grade 6', 'Alexander', v_party, v_color, 2);
  end if;

  -- ---------- Vice President ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Vice President';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Vice President', 1, 2) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Gian Franco B. Arendaing') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Gian Franco B. Arendaing', 'Grade 5', 'Anselm', v_party, v_color, 2);
  end if;

  -- ---------- Secretary ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Secretary';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Secretary', 1, 3) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Ayesha Sarah Magistrado') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Ayesha Sarah Magistrado', 'Grade 6', 'Androcles', v_party, v_color, 2);
  end if;

  -- ---------- Budget and Finance ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Budget and Finance';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Budget and Finance', 1, 4) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Shandrix M. Reyes') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Shandrix M. Reyes', 'Grade 6', 'Alexander', v_party, v_color, 2);
  end if;

  -- ---------- Public Relation Officer ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Public Relation Officer';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Public Relation Officer', 1, 5) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Mary Dyane R. Rentoy') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Mary Dyane R. Rentoy', 'Grade 6', 'Androcles', v_party, v_color, 2);
  end if;

  -- ---------- Grade 1 Representative ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Grade 1 Representative';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Grade 1 Representative', 1, 6) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Francelle G. Barrameda') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Francelle G. Barrameda', 'Grade 1', 'Ashbel', v_party, v_color, 2);
  end if;

  -- ---------- Grade 2 Representative ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Grade 2 Representative';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Grade 2 Representative', 1, 7) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Savannah Eve Hemady') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Savannah Eve Hemady', 'Grade 2', 'Timothy', v_party, v_color, 2);
  end if;

  -- ---------- Grade 3 Representative ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Grade 3 Representative';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Grade 3 Representative', 1, 8) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Janzlyn Faith A. Tiaba') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Janzlyn Faith A. Tiaba', 'Grade 3', 'Clovis', v_party, v_color, 2);
  end if;

  -- ---------- Grade 4 Representative ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Grade 4 Representative';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Grade 4 Representative', 1, 9) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Johanna T. Dialogo') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Johanna T. Dialogo', 'Grade 4', 'Magnus', v_party, v_color, 2);
  end if;

  -- ---------- Grade 5 Representative ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Grade 5 Representative';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Grade 5 Representative', 1, 10) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Athena Guevarra') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Athena Guevarra', 'Grade 5', 'Zachary', v_party, v_color, 2);
  end if;

  -- ---------- Grade 6 Representative ----------
  select id into v_pos_id from public.positions where election_id = v_election_id and position_name = 'Grade 6 Representative';
  if not found then
    insert into public.positions (election_id, position_name, max_votes, rank_order)
    values (v_election_id, 'Grade 6 Representative', 1, 11) returning id into v_pos_id;
  end if;
  if not exists (select 1 from public.candidates where position_id = v_pos_id and candidate_name = 'Kenjie Tiaba') then
    insert into public.candidates (position_id, candidate_name, grade_level, section, party_list, party_color, display_order)
    values (v_pos_id, 'Kenjie Tiaba', 'Grade 6', 'Androcles', v_party, v_color, 2);
  end if;

  raise notice 'Yes Party candidates processed for election %', v_election_id;
end $$;
