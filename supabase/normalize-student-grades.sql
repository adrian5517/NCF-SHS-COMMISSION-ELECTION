-- Normalize student grade_level values so they match position eligibility
-- values ('Grade 11' / 'Grade 12'). Safe to re-run.
update public.students
set grade_level = case
  when grade_level = '11' then 'Grade 11'
  when grade_level = '12' then 'Grade 12'
  else grade_level
end
where grade_level in ('11', '12');
