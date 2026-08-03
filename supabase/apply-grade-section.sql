-- Run this in the Supabase SQL editor for project ynuxlofntavdeyhtjkof to
-- add grade_level + section to the live results feed (watch/projector cards).
-- Safe to re-run: it's a create-or-replace of the existing function.

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
    -- Persisted tallies are maintained inside submit_ballot, so we can read
    -- the current counts directly without rescanning votes or abstentions.
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

revoke all on function public.get_live_stats(uuid) from public;
grant execute on function public.get_live_stats(uuid) to anon, authenticated;
