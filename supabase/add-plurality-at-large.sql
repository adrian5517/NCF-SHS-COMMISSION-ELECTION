-- Run this in the Supabase SQL editor to switch councilor-type positions to
-- plurality-at-large voting (voters may choose up to all candidates), instead
-- of a fixed max_votes cap. Safe to re-run: ALTER is idempotent, and the
-- functions are create-or-replace.

alter table public.positions
  add column if not exists plurality_at_large boolean not null default false;

-- Councilor positions (multi-seat) use plurality-at-large.
update public.positions
set plurality_at_large = true
where position_name ilike '%councilor%';

-- get_ballot: expose the flag so the kiosk knows the voting rule.
drop function if exists public.get_ballot(uuid);
create or replace function public.get_ballot(p_election_id uuid, p_grade_level text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'election', (select jsonb_build_object('id', e.id, 'title', e.title, 'logo_url', e.logo_url)
                 from public.elections e where e.id = p_election_id),
    'positions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'position_name', p.position_name, 'max_votes', p.max_votes,
        'eligible_grade_levels', p.eligible_grade_levels,
        'plurality_at_large', p.plurality_at_large,
        'candidates', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', c.id, 'candidate_name', c.candidate_name, 'grade_level', c.grade_level,
            'section', c.section, 'party_list', c.party_list, 'party_color', c.party_color,
            'photo_url', c.photo_url, 'motto', c.motto
          ) order by c.display_order, c.candidate_name)
          from public.candidates c where c.position_id = p.id), '[]'::jsonb)
      ) order by p.rank_order)
      from public.positions p
      where p.election_id = p_election_id
        and (p.eligible_grade_levels = '{}' or p_grade_level is null or p_grade_level = any(p.eligible_grade_levels))), '[]'::jsonb)
  );
$$;

-- submit_ballot: for plurality-at-large positions the max_votes cap is not
-- enforced — the voter may choose as many candidates as exist (each selected
-- candidate is still validated to belong to the position).
drop function if exists public.submit_ballot(uuid, uuid, jsonb);
create or replace function public.submit_ballot(
  p_code_id uuid,
  p_student_id uuid,
  p_selections jsonb,
  p_grade_level text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code public.voting_codes;
  v_election public.elections;
  v_position public.positions;
  v_pos_id text;
  v_cand_id text;
  v_count int;
  v_selection jsonb;
begin
  -- Lock the code row so two submissions of the same code serialize.
  select * into v_code from public.voting_codes where id = p_code_id for update;
  if not found or v_code.student_id <> p_student_id then
    return jsonb_build_object('ok', false, 'error', 'Invalid voting session.');
  end if;
  if v_code.is_used then
    return jsonb_build_object('ok', false, 'error', 'This code was already used.');
  end if;
  if v_code.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'Your code expired. Ask for a new one.');
  end if;

  select * into v_election from public.elections where id = v_code.election_id;
  if v_election.status <> 'ongoing' or now() < v_election.start_date or now() > v_election.end_date then
    return jsonb_build_object('ok', false, 'error', 'The election is not open right now.');
  end if;

  -- Every key in the payload must be a real position in this election
  -- AND one the student's grade level is allowed to vote in.
  for v_pos_id in select jsonb_object_keys(p_selections) loop
    if not exists (select 1 from public.positions
                   where id = v_pos_id::uuid and election_id = v_election.id
                     and (eligible_grade_levels = '{}'
                          or p_grade_level is null
                          or p_grade_level = any(eligible_grade_levels))) then
      return jsonb_build_object('ok', false, 'error', 'Ballot mismatch. Please try again.');
    end if;
  end loop;

  -- Walk every position the student is eligible for: insert votes for chosen
  -- candidates, or record an anonymous abstention when they picked no one.
  for v_position in select * from public.positions where election_id = v_election.id
    and (eligible_grade_levels = '{}' or p_grade_level is null or p_grade_level = any(eligible_grade_levels)) loop
    v_selection := coalesce(p_selections->v_position.id::text, '[]'::jsonb);

    select count(*) into v_count from jsonb_array_elements_text(v_selection);
    if not v_position.plurality_at_large and v_count > v_position.max_votes then
      return jsonb_build_object('ok', false, 'error',
        format('Too many choices for %s (max %s).', v_position.position_name, v_position.max_votes));
    end if;

    if v_count = 0 then
      insert into public.abstentions (election_id, position_id) values (v_election.id, v_position.id);
      insert into public.abstention_tallies (election_id, position_id, abstentions)
      values (v_election.id, v_position.id, 1)
      on conflict (election_id, position_id)
      do update set abstentions = public.abstention_tallies.abstentions + 1;
    else
      for v_cand_id in select jsonb_array_elements_text(v_selection) loop
        if not exists (select 1 from public.candidates
                       where id = v_cand_id::uuid and position_id = v_position.id) then
          return jsonb_build_object('ok', false, 'error', 'Ballot mismatch. Please try again.');
        end if;
        insert into public.votes (election_id, position_id, candidate_id)
        values (v_election.id, v_position.id, v_cand_id::uuid);
        insert into public.vote_tallies (election_id, position_id, candidate_id, votes)
        values (v_election.id, v_position.id, v_cand_id::uuid, 1)
        on conflict (election_id, candidate_id)
        do update set votes = public.vote_tallies.votes + 1;
      end loop;
    end if;
  end loop;

  update public.voting_codes set is_used = true where id = v_code.id;
  update public.students set status = 'voted' where id = p_student_id;

  return jsonb_build_object('ok', true);
end $$;

-- Lock down RPC execution (old signatures dropped above).
revoke all on function public.validate_voting_code(text, text) from public;
revoke all on function public.get_ballot(uuid, text) from public;
revoke all on function public.submit_ballot(uuid, uuid, jsonb, text) from public;
grant execute on function public.validate_voting_code(text, text) to anon, authenticated;
grant execute on function public.get_ballot(uuid, text) to anon, authenticated;
grant execute on function public.submit_ballot(uuid, uuid, jsonb, text) to anon, authenticated;
