-- Growth measurements per child (weight, height, head circumference).
-- Uses public.update_updated_at_column() from 20240201_milestones.sql.

-- ---------------------------------------------------------------------------
-- growth_measurements
-- ---------------------------------------------------------------------------
create table public.growth_measurements (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  measured_at date not null,
  weight_kg numeric(5, 3),
  height_cm numeric(5, 1),
  head_cm numeric(5, 1),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index growth_measurements_child_id_idx
  on public.growth_measurements (child_id);

create index growth_measurements_child_id_measured_at_idx
  on public.growth_measurements (child_id, measured_at);

comment on table public.growth_measurements is
  'Parent-entered growth measurements—informational, not a clinical record.';

create trigger growth_measurements_set_updated_at
  before update on public.growth_measurements
  for each row
  execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS (same ownership pattern as child_milestones)
-- ---------------------------------------------------------------------------
alter table public.growth_measurements enable row level security;

create policy "growth_measurements_select_own"
  on public.growth_measurements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = growth_measurements.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "growth_measurements_insert_own"
  on public.growth_measurements
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.children c
      where c.id = growth_measurements.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "growth_measurements_update_own"
  on public.growth_measurements
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = growth_measurements.child_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.children c
      where c.id = growth_measurements.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "growth_measurements_delete_own"
  on public.growth_measurements
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = growth_measurements.child_id
        and c.user_id = auth.uid()
    )
  );
