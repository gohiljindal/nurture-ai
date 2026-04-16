-- Milestone tracking: reference definitions + per-child progress
-- Requires `public.children` to already exist (created outside this repo or in an earlier migration).

-- ---------------------------------------------------------------------------
-- milestone_definitions (public reference data)
-- ---------------------------------------------------------------------------
create table public.milestone_definitions (
  id uuid primary key default gen_random_uuid(),
  domain text not null
    check (
      domain in (
        'motor_gross',
        'motor_fine',
        'language',
        'social',
        'cognitive',
        'feeding',
        'sleep'
      )
    ),
  age_months_min integer not null,
  age_months_max integer not null,
  age_months_avg integer not null,
  title text not null,
  description text not null,
  why_it_matters text not null,
  what_to_do_if_delayed text not null,
  red_flag boolean default false,
  source text default 'AAP/WHO 2023',
  premature_notes text,
  sort_order integer default 0,
  created_at timestamptz default now(),
  check (age_months_min >= 0),
  check (age_months_max >= age_months_min),
  check (age_months_avg between age_months_min and age_months_max)
);

create index milestone_definitions_domain_age_min_idx
  on public.milestone_definitions (domain, age_months_min);

comment on table public.milestone_definitions is
  'Reference milestones for education—not a substitute for developmental screening.';

-- ---------------------------------------------------------------------------
-- child_milestones (per-child tracking)
-- ---------------------------------------------------------------------------
create table public.child_milestones (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  milestone_id uuid not null references public.milestone_definitions (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'achieved', 'skipped', 'flagged')),
  achieved_at date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (child_id, milestone_id)
);

create index child_milestones_child_id_idx on public.child_milestones (child_id);

comment on table public.child_milestones is
  'Parent-recorded milestone status for a child—informational, not clinical record.';

-- ---------------------------------------------------------------------------
-- updated_at trigger (shared helper for child_milestones and future tables)
-- ---------------------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger child_milestones_set_updated_at
  before update on public.child_milestones
  for each row
  execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.milestone_definitions enable row level security;
alter table public.child_milestones enable row level security;

-- Reference data: readable by anyone using the anon or authenticated role
create policy "milestone_definitions_select_public"
  on public.milestone_definitions
  for select
  to anon, authenticated
  using (true);

-- Child rows: only for children owned by the current user
create policy "child_milestones_select_own"
  on public.child_milestones
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = child_milestones.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "child_milestones_insert_own"
  on public.child_milestones
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.children c
      where c.id = child_milestones.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "child_milestones_update_own"
  on public.child_milestones
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = child_milestones.child_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.children c
      where c.id = child_milestones.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "child_milestones_delete_own"
  on public.child_milestones
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = child_milestones.child_id
        and c.user_id = auth.uid()
    )
  );
