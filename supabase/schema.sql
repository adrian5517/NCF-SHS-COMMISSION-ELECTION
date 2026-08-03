-- ============================================================
-- NCF-SHS-COMMISSION-ON-ELECTIONS — Supabase schema
-- Run this whole file in the Supabase SQL Editor (one shot).
-- ============================================================

-- ---------- PROFILES (staff roles) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'watcher' check (role in ('admin', 'watcher')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile when a staff user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'watcher')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- ELECTIONS ----------
create table if not exists public.elections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  logo_url text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  status text not null default 'draft'
    check (status in ('draft', 'upcoming', 'ongoing', 'closed', 'archived')),
  hide_live_results boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

-- Only one election may be 'ongoing' at a time.
create unique index if not exists one_ongoing_election
  on public.elections (status) where (status = 'ongoing');

-- ---------- POSITIONS ----------
create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  position_name text not null,
  max_votes int not null default 1 check (max_votes >= 1),
  rank_order int not null default 0,
  eligible_grade_levels text[] not null default '{}'
);
create index if not exists positions_election_idx on public.positions (election_id, rank_order);

-- ---------- CANDIDATES ----------
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.positions (id) on delete cascade,
  candidate_name text not null,
  grade_level text not null default '',
  section text not null default '',
  party_list text not null default '',
  party_color text not null default '#16a34a',
  photo_url text,
  motto text not null default '',
  display_order int not null default 0
);
create index if not exists candidates_position_idx on public.candidates (position_id, display_order);

-- ---------- STUDENTS ----------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  lrn text not null unique,
  full_name text not null,
  grade_level text not null,
  section text not null,
  strand text not null default '',
  status text not null default 'pending' check (status in ('pending', 'voted')),
  created_at timestamptz not null default now()
);
create index if not exists students_grade_section_idx on public.students (grade_level, section);

-- ---------- VOTING CODES ----------
create table if not exists public.voting_codes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  election_id uuid not null references public.elections (id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  is_used boolean not null default false,
  created_at timestamptz not null default now(),
  unique (election_id, code)
);
create index if not exists voting_codes_student_idx on public.voting_codes (student_id, election_id);

-- ---------- VOTES (anonymous: no student_id, ever) ----------
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  position_id uuid not null references public.positions (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists votes_tally_idx on public.votes (election_id, position_id, candidate_id);

-- Persisted tallies keep live results fast and let submit_ballot update the
-- write path and counts inside the same database transaction.
create table if not exists public.vote_tallies (
  election_id uuid not null references public.elections (id) on delete cascade,
  position_id uuid not null references public.positions (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  votes bigint not null default 0,
  primary key (election_id, candidate_id)
);
create index if not exists vote_tallies_position_idx on public.vote_tallies (election_id, position_id);

insert into public.vote_tallies (election_id, position_id, candidate_id, votes)
select election_id, position_id, candidate_id, count(*)
from public.votes
group by election_id, position_id, candidate_id
on conflict (election_id, candidate_id)
do update set votes = excluded.votes;

-- ---------- ABSTENTIONS (anonymous, mirrors votes: no student_id) ----------
create table if not exists public.abstentions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  position_id uuid not null references public.positions (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists abstentions_tally_idx on public.abstentions (election_id, position_id);

create table if not exists public.abstention_tallies (
  election_id uuid not null references public.elections (id) on delete cascade,
  position_id uuid not null references public.positions (id) on delete cascade,
  abstentions bigint not null default 0,
  primary key (election_id, position_id)
);
create index if not exists abstention_tallies_position_idx on public.abstention_tallies (election_id, position_id);

insert into public.abstention_tallies (election_id, position_id, abstentions)
select election_id, position_id, count(*)
from public.abstentions
group by election_id, position_id
on conflict (election_id, position_id)
do update set abstentions = excluded.abstentions;

-- ---------- AUDIT LOGS ----------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- ============================================================
-- HELPERS
-- ============================================================

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ============================================================
-- RPC: validate a student's Student ID + code (called anonymously by
-- the kiosk login server action). SECURITY DEFINER so the anon
-- key never gets read access to students / voting_codes.
-- ============================================================
create or replace function public.validate_voting_code(p_lrn text, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_student public.students;
  v_code public.voting_codes;
  v_election public.elections;
begin
  select * into v_student from public.students where lrn = p_lrn;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'We could not find that Student ID. Please check for typos, or ask your teacher for help.');
  end if;
  if v_student.status = 'voted' then
    return jsonb_build_object('ok', false, 'error', 'You have already voted. Thank you for participating!');
  end if;

  select * into v_code from public.voting_codes
    where student_id = v_student.id and upper(code) = upper(p_code)
    order by created_at desc limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid voting code.');
  end if;
  if v_code.is_used then
    return jsonb_build_object('ok', false, 'error', 'This code was already used.');
  end if;
  if v_code.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'This code has expired. Ask for a new one.');
  end if;

  select * into v_election from public.elections where id = v_code.election_id;
  if v_election.status <> 'ongoing' or now() < v_election.start_date or now() > v_election.end_date then
    return jsonb_build_object('ok', false, 'error', 'The election is not open right now.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'student_id', v_student.id,
    'student_name', v_student.full_name,
    'grade_level', v_student.grade_level,
    'code_id', v_code.id,
    'election_id', v_election.id
  );
end $$;

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
-- RPC: submit ballot — single atomic transaction.
-- Re-validates everything server-side, inserts anonymous votes,
-- burns the code, marks the student as voted.
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
    if v_count > v_position.max_votes then
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

-- ============================================================
-- RPC: the single active (non-archived, most relevant) election.
-- Safe for anon: exposes only election metadata.
-- ============================================================
create or replace function public.get_active_election()
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(t) from (
    select id, title, description, logo_url, start_date, end_date, status, hide_live_results
    from public.elections
    where status in ('upcoming', 'ongoing', 'closed')
    order by case status when 'ongoing' then 0 when 'upcoming' then 1 else 2 end, start_date desc
    limit 1
  ) t;
$$;

-- ============================================================
-- RPC: aggregate turnout + tallies for dashboards and projector.
-- Anonymous-safe: only aggregates, and tallies are withheld while
-- hide_live_results is on and the election is still open.
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

-- ============================================================
-- RPC: reset an election — deletes its cast votes and voting
-- codes, and puts every student who voted in it back to
-- 'pending' so the election can be re-run. Admin-only: the
-- votes table has no client-writable RLS policy, so this
-- SECURITY DEFINER function is the only way to touch it, and it
-- re-checks is_admin() itself for defense in depth.
-- ============================================================
create or replace function public.reset_election_votes(p_election_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_student_ids uuid[];
  v_vote_count int;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Only admins can reset an election.');
  end if;

  select array_agg(student_id) into v_student_ids
    from public.voting_codes where election_id = p_election_id and is_used = true;

  select count(*) into v_vote_count from public.votes where election_id = p_election_id;

  delete from public.votes where election_id = p_election_id;
  delete from public.abstentions where election_id = p_election_id;
  delete from public.vote_tallies where election_id = p_election_id;
  delete from public.abstention_tallies where election_id = p_election_id;
  delete from public.voting_codes where election_id = p_election_id;

  if v_student_ids is not null then
    update public.students set status = 'pending' where id = any(v_student_ids);
  end if;

  return jsonb_build_object(
    'ok', true,
    'votes_deleted', v_vote_count,
    'students_reset', coalesce(array_length(v_student_ids, 1), 0)
  );
end $$;

-- Lock down RPC execution.
revoke all on function public.validate_voting_code(text, text) from public;
revoke all on function public.get_ballot(uuid, text) from public;
revoke all on function public.submit_ballot(uuid, uuid, jsonb, text) from public;
grant execute on function public.validate_voting_code(text, text) to anon, authenticated;
grant execute on function public.get_ballot(uuid, text) to anon, authenticated;
grant execute on function public.submit_ballot(uuid, uuid, jsonb, text) to anon, authenticated;
revoke all on function public.get_active_election() from public;
revoke all on function public.get_live_stats(uuid) from public;
grant execute on function public.get_active_election() to anon, authenticated;
grant execute on function public.get_live_stats(uuid) to anon, authenticated;
revoke all on function public.reset_election_votes(uuid) from public;
grant execute on function public.reset_election_votes(uuid) to authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- Staff read everything; only admins write; anon reads nothing
-- directly (the kiosk goes through SECURITY DEFINER RPCs above).
-- ============================================================
alter table public.profiles enable row level security;
alter table public.elections enable row level security;
alter table public.positions enable row level security;
alter table public.candidates enable row level security;
alter table public.students enable row level security;
alter table public.voting_codes enable row level security;
alter table public.votes enable row level security;
alter table public.abstentions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select using (auth.uid() = id or public.is_admin());

drop policy if exists "staff read elections" on public.elections;
create policy "staff read elections" on public.elections for select using (public.is_staff());
drop policy if exists "admin write elections" on public.elections;
create policy "admin write elections" on public.elections for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff read positions" on public.positions;
create policy "staff read positions" on public.positions for select using (public.is_staff());
drop policy if exists "admin write positions" on public.positions;
create policy "admin write positions" on public.positions for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff read candidates" on public.candidates;
create policy "staff read candidates" on public.candidates for select using (public.is_staff());
drop policy if exists "admin write candidates" on public.candidates;
create policy "admin write candidates" on public.candidates for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff read students" on public.students;
create policy "staff read students" on public.students for select using (public.is_staff());
drop policy if exists "admin write students" on public.students;
create policy "admin write students" on public.students for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff read codes" on public.voting_codes;
create policy "staff read codes" on public.voting_codes for select using (public.is_staff());
drop policy if exists "admin write codes" on public.voting_codes;
create policy "admin write codes" on public.voting_codes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff read votes" on public.votes;
create policy "staff read votes" on public.votes for select using (public.is_staff());
-- No insert policy on votes: inserts happen only inside submit_ballot (SECURITY DEFINER).

drop policy if exists "staff read abstentions" on public.abstentions;
create policy "staff read abstentions" on public.abstentions for select using (public.is_staff());
-- No insert policy: inserts happen only inside submit_ballot (SECURITY DEFINER).

drop policy if exists "staff read audit" on public.audit_logs;
create policy "staff read audit" on public.audit_logs for select using (public.is_staff());
drop policy if exists "staff write audit" on public.audit_logs;
create policy "staff write audit" on public.audit_logs for insert with check (public.is_staff());

-- ============================================================
-- REALTIME: broadcast changes on the tables the dashboards watch.
-- ============================================================
do $$ begin
  alter publication supabase_realtime add table public.students;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.voting_codes;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.votes;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.elections;
exception when duplicate_object then null; end $$;

-- ============================================================
-- STORAGE: public bucket for candidate photos / election logos.
-- ============================================================
insert into storage.buckets (id, name, public) values ('election-media', 'election-media', true)
on conflict (id) do nothing;

drop policy if exists "public read election media" on storage.objects;
create policy "public read election media" on storage.objects
  for select using (bucket_id = 'election-media');
drop policy if exists "admin upload election media" on storage.objects;
create policy "admin upload election media" on storage.objects
  for insert with check (bucket_id = 'election-media' and public.is_admin());
drop policy if exists "admin update election media" on storage.objects;
create policy "admin update election media" on storage.objects
  for update using (bucket_id = 'election-media' and public.is_admin());
drop policy if exists "admin delete election media" on storage.objects;
create policy "admin delete election media" on storage.objects
  for delete using (bucket_id = 'election-media' and public.is_admin());

-- ============================================================
-- AFTER RUNNING THIS FILE:
-- 1. Create staff users in Authentication > Users (email + password).
-- 2. Promote your admin:
--    update public.profiles set role = 'admin' where id = '<auth user uuid>';
-- ============================================================
