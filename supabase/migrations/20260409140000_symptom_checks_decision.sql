alter table public.symptom_checks
  add column if not exists decision_source text,
  add column if not exists rule_reason text;
