-- ============================================================
-- NCF-SHS-COMMISSION-ON-ELECTIONS — create the election
-- Paste into the Supabase SQL Editor and run once, before
-- seed-lead-party.sql / seed-yes-party.sql (or any other
-- candidate seeder).
--
-- Edit the values below to match your real election, then run.
-- Skips creating a duplicate if a usable election (ongoing,
-- upcoming, or draft) already exists.
-- ============================================================

do $$
declare
  -- ---- edit these ----
  v_title text := 'SSG Election';
  v_description text := 'Supreme Student Government election.';
  v_start timestamptz := now();
  v_end timestamptz := now() + interval '7 days';
  v_status text := 'ongoing'; -- 'draft' | 'upcoming' | 'ongoing'
  -- ---------------------
  v_election_id uuid;
begin
  select id into v_election_id
  from public.elections
  where status in ('ongoing', 'upcoming', 'draft')
  order by case status when 'ongoing' then 0 when 'upcoming' then 1 else 2 end, created_at desc
  limit 1;

  if v_election_id is not null then
    raise notice 'An election already exists (id %) — skipped creating a new one.', v_election_id;
  else
    insert into public.elections (title, description, start_date, end_date, status)
    values (v_title, v_description, v_start, v_end, v_status)
    returning id into v_election_id;
    raise notice 'Created election "%" (id %).', v_title, v_election_id;
  end if;
end $$;
