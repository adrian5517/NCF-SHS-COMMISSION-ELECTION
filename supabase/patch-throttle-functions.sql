-- Run this in the Supabase SQL Editor if student login says:
-- "Connection problem. Please try again."
-- after enabling database-backed throttles.

create table if not exists public.login_attempts (
  attempt_key text primary key,
  attempt_count int not null default 0,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists login_attempts_reset_idx on public.login_attempts (reset_at);

create table if not exists public.submit_attempts (
  attempt_key text primary key,
  attempt_count int not null default 0,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists submit_attempts_reset_idx on public.submit_attempts (reset_at);

create or replace function public.check_login_attempt_limit(
  p_attempt_key text,
  p_window_ms int default 60000,
  p_max_attempts int default 8
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_now timestamptz := now();
  v_row public.login_attempts;
begin
  insert into public.login_attempts (attempt_key, attempt_count, reset_at, updated_at)
  values (p_attempt_key, 1, v_now + make_interval(secs => p_window_ms / 1000.0), v_now)
  on conflict (attempt_key) do update
  set attempt_count = case
        when public.login_attempts.reset_at < v_now then 1
        else public.login_attempts.attempt_count + 1
      end,
      reset_at = case
        when public.login_attempts.reset_at < v_now then v_now + make_interval(secs => p_window_ms / 1000.0)
        else public.login_attempts.reset_at
      end,
      updated_at = v_now
  returning * into v_row;

  if v_row.attempt_count > p_max_attempts then
    return jsonb_build_object('ok', false, 'error', 'Too many attempts. Please wait a minute and try again.');
  end if;

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.check_submit_attempt_limit(
  p_attempt_key text,
  p_window_ms int,
  p_max_attempts int
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_now timestamptz := now();
  v_row public.submit_attempts;
begin
  insert into public.submit_attempts (attempt_key, attempt_count, reset_at, updated_at)
  values (p_attempt_key, 1, v_now + make_interval(secs => p_window_ms / 1000.0), v_now)
  on conflict (attempt_key) do update
  set attempt_count = case
        when public.submit_attempts.reset_at < v_now then 1
        else public.submit_attempts.attempt_count + 1
      end,
      reset_at = case
        when public.submit_attempts.reset_at < v_now then v_now + make_interval(secs => p_window_ms / 1000.0)
        else public.submit_attempts.reset_at
      end,
      updated_at = v_now
  returning * into v_row;

  if v_row.attempt_count > p_max_attempts then
    return jsonb_build_object('ok', false, 'error', 'Too many attempts. Please wait and try again.');
  end if;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.check_login_attempt_limit(text, int, int) from public;
revoke all on function public.check_submit_attempt_limit(text, int, int) from public;
grant execute on function public.check_login_attempt_limit(text, int, int) to service_role;
grant execute on function public.check_submit_attempt_limit(text, int, int) to service_role;

alter table public.login_attempts enable row level security;
alter table public.submit_attempts enable row level security;

drop policy if exists "staff read login attempts" on public.login_attempts;
create policy "staff read login attempts" on public.login_attempts for select using (public.is_staff());

drop policy if exists "staff read submit attempts" on public.submit_attempts;
create policy "staff read submit attempts" on public.submit_attempts for select using (public.is_staff());

notify pgrst, 'reload schema';
