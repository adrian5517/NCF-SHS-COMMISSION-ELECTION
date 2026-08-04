-- Run this in the Supabase SQL Editor if bulk code generation says:
-- "Could not find the function public.replace_voting_codes(...) in the schema cache"

create or replace function public.replace_voting_codes(
  p_election_id uuid,
  p_rows jsonb,
  p_force boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
  v_student_ids uuid[] := '{}';
  v_inserted int := 0;
begin
  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_student_ids := array_append(v_student_ids, (v_row->>'student_id')::uuid);
  end loop;

  if coalesce(array_length(v_student_ids, 1), 0) = 0 then
    return jsonb_build_object('ok', true, 'count', 0);
  end if;

  delete from public.voting_codes
  where election_id = p_election_id
    and is_used = false
    and student_id = any(v_student_ids)
    and (p_force or expires_at < now());

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    insert into public.voting_codes (student_id, election_id, code, expires_at)
    values (
      (v_row->>'student_id')::uuid,
      p_election_id,
      v_row->>'code',
      (v_row->>'expires_at')::timestamptz
    );
    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object('ok', true, 'count', v_inserted);
end $$;

revoke all on function public.replace_voting_codes(uuid, jsonb, boolean) from public;
grant execute on function public.replace_voting_codes(uuid, jsonb, boolean) to service_role;

-- Ask PostgREST/Supabase API to reload the function list immediately.
notify pgrst, 'reload schema';
