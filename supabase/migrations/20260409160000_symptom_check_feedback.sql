create table if not exists public.symptom_check_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  check_id uuid not null references public.symptom_checks (id) on delete cascade,
  helpful boolean not null,
  created_at timestamptz not null default now(),
  unique (user_id, check_id)
);

alter table public.symptom_check_feedback enable row level security;

create policy "Users can view own symptom check feedback"
on public.symptom_check_feedback
for select
using (auth.uid() = user_id);

create policy "Users can insert own symptom check feedback"
on public.symptom_check_feedback
for insert
with check (auth.uid() = user_id);

create policy "Users can update own symptom check feedback"
on public.symptom_check_feedback
for update
using (auth.uid() = user_id);
