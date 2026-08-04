-- Adds plurality_at_large to the live-results feed and hardens submit_ballot
-- against duplicate candidate selections. Safe to re-run.

-- get_live_stats: expose the voting rule so dashboards can say "vote for up
-- to N" instead of a fixed max_votes cap.
create or replace function public.get_live_stats(p_election_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_election public.elections;
  v_results jsonb;
begin
  select * into v_election from public.elections where id = p_election_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Election not found');
  end if;

  if v_election.hide_live_results and v_election.status not in ('closed', 'archived') then
    v_results := null;
  else
    with vote_counts as (
      select candidate_id, count(*) as votes
      from public.votes
      where election_id = p_election_id
      group by candidate_id
    ),
    abstain_counts as (
      select position_id, count(*) as abstained
      from public.abstentions
      where election_id = p_election_id
      group by position_id
    )
    select jsonb_agg(pos order by pos->'rank_order') into v_results
    from (
      select jsonb_build_object(
        'position_id', p.id,
        'position_name', p.position_name,
        'max_votes', p.max_votes,
        'rank_order', p.rank_order,
        'plurality_at_large', p.plurality_at_large,
        'abstain_count', coalesce(ac.abstained, 0),
        'candidates', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', c.id, 'candidate_name', c.candidate_name, 'party_list', c.party_list,
            'party_color', c.party_color, 'photo_url', c.photo_url,
            'grade_level', c.grade_level, 'section', c.section,
            'votes', coalesce(vc.votes, 0)
          ) order by coalesce(vc.votes, 0) desc, c.candidate_name)
          from public.candidates c
          left join vote_counts vc on vc.candidate_id = c.id
          where c.position_id = p.id), '[]'::jsonb)
      ) as pos
      from public.positions p
      left join abstain_counts ac on ac.position_id = p.id
      where p.election_id = p_election_id
    ) sub;
  end if;

  return jsonb_build_object(
    'ok', true,
    'election', jsonb_build_object(
      'id', v_election.id, 'title', v_election.title, 'status', v_election.status,
      'hide_live_results', v_election.hide_live_results, 'end_date', v_election.end_date
    ),
    'turnout', jsonb_build_object(
      'total', (select count(*) from public.students),
      'voted', (select count(*) from public.students where status = 'voted'),
      'groups', coalesce((
        select jsonb_agg(jsonb_build_object(
          'grade_level', g.grade_level, 'section', g.section, 'total', g.total, 'voted', g.voted
        ) order by g.grade_level, g.section)
        from (
          select grade_level, section, count(*) as total,
                 count(*) filter (where status = 'voted') as voted
          from public.students group by grade_level, section
        ) g), '[]'::jsonb)
    ),
    'results', v_results
  );
end $$;

revoke all on function public.get_live_stats(uuid) from public;
grant execute on function public.get_live_stats(uuid) to anon, authenticated;

-- submit_ballot: reject selections containing the same candidate twice (a
-- plurality-at-large ballot must not double-count one candidate).
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

  for v_pos_id in select jsonb_object_keys(p_selections) loop
    if not exists (select 1 from public.positions
                   where id = v_pos_id::uuid and election_id = v_election.id
                     and (eligible_grade_levels = '{}'
                          or p_grade_level is null
                          or p_grade_level = any(eligible_grade_levels))) then
      return jsonb_build_object('ok', false, 'error', 'Ballot mismatch. Please try again.');
    end if;
  end loop;

  for v_position in select * from public.positions where election_id = v_election.id
    and (eligible_grade_levels = '{}' or p_grade_level is null or p_grade_level = any(eligible_grade_levels)) loop
    v_selection := coalesce(p_selections->v_position.id::text, '[]'::jsonb);

    select count(*) into v_count from jsonb_array_elements_text(v_selection);
    if not v_position.plurality_at_large and v_count > v_position.max_votes then
      return jsonb_build_object('ok', false, 'error',
        format('Too many choices for %s (max %s).', v_position.position_name, v_position.max_votes));
    end if;
    if (select count(distinct j.value) from jsonb_array_elements_text(v_selection) j) <> v_count then
      return jsonb_build_object('ok', false, 'error', 'Ballot mismatch. Please try again.');
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

revoke all on function public.submit_ballot(uuid, uuid, jsonb, text) from public;
grant execute on function public.submit_ballot(uuid, uuid, jsonb, text) to anon, authenticated;
