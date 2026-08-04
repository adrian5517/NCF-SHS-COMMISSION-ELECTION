-- Removes plurality-at-large voting. Positions go back to a fixed max_votes
-- cap ("vote for up to N seats"), which is the standard election rule. The
-- existing councilor positions already carry sensible max_votes values
-- (e.g. Grade 12 Councilors = 6, Grade 11 Councilors = 2), so voters are
-- simply capped at the seat count after this runs.
--
-- Also includes the fast set-based submit_ballot (bulk inserts instead of
-- per-row loops) so submissions stay quick. Safe to re-run: the ALTER is
-- idempotent and the functions are create-or-replace.

alter table public.positions drop column if exists plurality_at_large;

-- ============================================================
-- RPC: fetch the ballot (positions + candidates) for the kiosk.
-- ============================================================
create or replace function public.get_ballot(p_election_id uuid, p_grade_level text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'election', (select jsonb_build_object('id', e.id, 'title', e.title, 'logo_url', e.logo_url)
                 from public.elections e where e.id = p_election_id),
    'positions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'position_name', p.position_name, 'max_votes', p.max_votes,
        'eligible_grade_levels', p.eligible_grade_levels,
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

-- ============================================================
-- RPC: submit ballot — single atomic transaction. Set-based bulk
-- inserts. Re-validates everything server-side, inserts anonymous
-- votes, burns the code, marks the student as voted.
-- p_selections: {"<position_id>": ["<candidate_id>", ...], ...}
-- ============================================================
create or replace function public.submit_ballot(
  p_code_id uuid,
  p_student_id uuid,
  p_selections jsonb,
  p_grade_level text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code public.voting_codes;
  v_election public.elections;
  v_bad_key text;
  v_bad_candidate uuid;
  v_too_many public.positions;
  v_duplicate uuid;
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

  -- Every key must be a well-formed UUID for a real position in this election
  -- AND one the student's grade level is allowed to vote in.
  select s.key into v_bad_key
  from jsonb_each(p_selections) s
  left join public.positions p
    on p.id = case when s.key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                   then s.key::uuid end
    and p.election_id = v_election.id
    and (p.eligible_grade_levels = '{}' or p_grade_level is null or p_grade_level = any(p.eligible_grade_levels))
  where p.id is null
  limit 1;
  if v_bad_key is not null then
    return jsonb_build_object('ok', false, 'error', 'Ballot mismatch. Please try again.');
  end if;

  -- Each chosen candidate must exist and belong to the position it is under.
  select c.id into v_bad_candidate
  from jsonb_each(p_selections) s
  cross join lateral jsonb_array_elements_text(s.value) chosen
  left join public.candidates c
    on c.id = case when chosen ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                   then chosen::uuid end
  where c.id is null or c.position_id <> s.key::uuid
  limit 1;
  if v_bad_candidate is not null then
    return jsonb_build_object('ok', false, 'error', 'Ballot mismatch. Please try again.');
  end if;

  -- Positions respect their max_votes cap.
  select p.* into v_too_many
  from jsonb_each(p_selections) s
  join public.positions p on p.id = s.key::uuid
  where jsonb_array_length(s.value) > p.max_votes
  limit 1;
  if v_too_many.id is not null then
    return jsonb_build_object('ok', false, 'error',
      format('Too many choices for %s (max %s).', v_too_many.position_name, v_too_many.max_votes));
  end if;

  -- No candidate may be selected twice anywhere on the ballot.
  select chosen::uuid into v_duplicate
  from jsonb_each(p_selections) s
  cross join lateral jsonb_array_elements_text(s.value) chosen
  where chosen ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  group by chosen
  having count(*) > 1
  limit 1;
  if v_duplicate is not null then
    return jsonb_build_object('ok', false, 'error', 'Ballot mismatch. Please try again.');
  end if;

  -- Bulk-insert the votes (keys and candidates already validated above).
  insert into public.votes (election_id, position_id, candidate_id)
  select v_election.id, s.key::uuid, c.id
  from jsonb_each(p_selections) s
  cross join lateral jsonb_array_elements_text(s.value) chosen
  join public.candidates c on c.id = chosen::uuid and c.position_id = s.key::uuid;

  -- Bulk-bump the persisted vote tallies.
  insert into public.vote_tallies (election_id, position_id, candidate_id, votes)
  select v_election.id, s.key::uuid, c.id, count(*)::bigint
  from jsonb_each(p_selections) s
  cross join lateral jsonb_array_elements_text(s.value) chosen
  join public.candidates c on c.id = chosen::uuid and c.position_id = s.key::uuid
  group by s.key, c.id
  on conflict (election_id, candidate_id)
  do update set votes = public.vote_tallies.votes + excluded.votes;

  -- Record an abstention for every eligible position the voter left empty.
  insert into public.abstentions (election_id, position_id)
  select v_election.id, p.id
  from public.positions p
  where p.election_id = v_election.id
    and (p.eligible_grade_levels = '{}' or p_grade_level is null or p_grade_level = any(p.eligible_grade_levels))
    and not exists (
      select 1 from jsonb_each(p_selections) s
      where s.key::uuid = p.id and jsonb_array_length(s.value) > 0
    );

  -- Bulk-bump the abstention tallies.
  insert into public.abstention_tallies (election_id, position_id, abstentions)
  select v_election.id, p.id, count(*)::bigint
  from public.positions p
  where p.election_id = v_election.id
    and (p.eligible_grade_levels = '{}' or p_grade_level is null or p_grade_level = any(p.eligible_grade_levels))
    and not exists (
      select 1 from jsonb_each(p_selections) s
      where s.key::uuid = p.id and jsonb_array_length(s.value) > 0
    )
  group by p.id
  on conflict (election_id, position_id)
  do update set abstentions = public.abstention_tallies.abstentions + excluded.abstentions;

  update public.voting_codes set is_used = true where id = v_code.id;
  update public.students set status = 'voted' where id = p_student_id;

  return jsonb_build_object('ok', true);
end $$;

-- ============================================================
-- RPC: aggregate turnout + tallies for dashboards and projector.
-- ============================================================
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
    -- Persisted tallies are updated in submit_ballot's transaction, so live
    -- stats can read the current counts directly without re-scanning votes.
    with vote_counts as (
      select candidate_id, votes
      from public.vote_tallies
      where election_id = p_election_id
    ),
    abstain_counts as (
      select position_id, abstentions as abstained
      from public.abstention_tallies
      where election_id = p_election_id
    )
    select jsonb_agg(pos order by pos->'rank_order') into v_results
    from (
      select jsonb_build_object(
        'position_id', p.id,
        'position_name', p.position_name,
        'max_votes', p.max_votes,
        'rank_order', p.rank_order,
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

-- Lock down RPC execution.
revoke all on function public.get_ballot(uuid, text) from public;
revoke all on function public.submit_ballot(uuid, uuid, jsonb, text) from public;
revoke all on function public.get_live_stats(uuid) from public;
grant execute on function public.get_ballot(uuid, text) to anon, authenticated;
grant execute on function public.submit_ballot(uuid, uuid, jsonb, text) to anon, authenticated;
grant execute on function public.get_live_stats(uuid) to anon, authenticated;
