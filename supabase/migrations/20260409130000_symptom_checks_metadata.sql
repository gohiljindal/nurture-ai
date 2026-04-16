alter table public.symptom_checks
  add column if not exists disclaimer_accepted boolean not null default false,
  add column if not exists model_used text,
  add column if not exists flow_version text,
  add column if not exists followup_count integer;
