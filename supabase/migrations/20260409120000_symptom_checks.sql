create table if not exists public.symptom_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  input_text text not null,
  urgency text not null,
  ai_response jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.symptom_checks enable row level security;

create policy "Users can view their own symptom checks"
on public.symptom_checks
for select
using (auth.uid() = user_id);

create policy "Users can insert their own symptom checks"
on public.symptom_checks
for insert
with check (auth.uid() = user_id);
