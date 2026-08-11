-- Add per-election Voting Mechanics (the pre-ballot gate the student
-- sees after logging in). Stored as JSONB so admins can tailor the
-- wording; the app falls back to its shared default when the value is
-- null, so this migration is safe to run at any time.
--
-- Shape (camelCase keys, see lib/voting-mechanics.ts):
--   {
--     "intro":          string,
--     "heading":        string,
--     "preface":        string,
--     "guidelines":     string[],
--     "consentNote":    string,
--     "acknowledgment": string
--   }

alter table public.elections
  add column if not exists voting_mechanics jsonb;

comment on column public.elections.voting_mechanics is
  'Configurable pre-vote "Voting Mechanics" gate content. Null or missing keys fall back to the shared default in lib/voting-mechanics.ts.';
