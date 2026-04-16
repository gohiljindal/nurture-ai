-- Feeding logs and allergen introduction tracking.
-- Uses public.update_updated_at_column() from 20240201_milestones.sql.

-- ---------------------------------------------------------------------------
-- feeding_logs
-- ---------------------------------------------------------------------------
create table public.feeding_logs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  logged_at timestamptz not null default now(),
  feeding_type text not null
    check (
      feeding_type in (
        'breast_left',
        'breast_right',
        'breast_both',
        'formula',
        'pumped',
        'solids',
        'water'
      )
    ),
  duration_minutes integer,
  volume_ml integer,
  solid_foods text,
  notes text,
  created_at timestamptz default now()
);

create index feeding_logs_child_id_logged_at_idx
  on public.feeding_logs (child_id, logged_at desc);

comment on table public.feeding_logs is
  'Parent-logged feeding events—informational, not a clinical record.';

-- ---------------------------------------------------------------------------
-- allergen_introductions
-- ---------------------------------------------------------------------------
create table public.allergen_introductions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  allergen text not null
    check (
      allergen in (
        'peanut',
        'egg',
        'dairy',
        'wheat',
        'soy',
        'tree_nut',
        'sesame',
        'fish',
        'shellfish'
      )
    ),
  introduced_at date,
  reaction_noted boolean default false,
  reaction_description text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (child_id, allergen)
);

create index allergen_introductions_child_id_idx
  on public.allergen_introductions (child_id);

comment on table public.allergen_introductions is
  'Per-child allergen introduction tracking—informational, not a clinical record.';

create trigger allergen_introductions_set_updated_at
  before update on public.allergen_introductions
  for each row
  execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS (same ownership pattern as child_milestones)
-- ---------------------------------------------------------------------------
alter table public.feeding_logs enable row level security;

create policy "feeding_logs_select_own"
  on public.feeding_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = feeding_logs.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "feeding_logs_insert_own"
  on public.feeding_logs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.children c
      where c.id = feeding_logs.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "feeding_logs_update_own"
  on public.feeding_logs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = feeding_logs.child_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.children c
      where c.id = feeding_logs.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "feeding_logs_delete_own"
  on public.feeding_logs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = feeding_logs.child_id
        and c.user_id = auth.uid()
    )
  );

alter table public.allergen_introductions enable row level security;

create policy "allergen_introductions_select_own"
  on public.allergen_introductions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = allergen_introductions.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "allergen_introductions_insert_own"
  on public.allergen_introductions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.children c
      where c.id = allergen_introductions.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "allergen_introductions_update_own"
  on public.allergen_introductions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = allergen_introductions.child_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.children c
      where c.id = allergen_introductions.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "allergen_introductions_delete_own"
  on public.allergen_introductions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = allergen_introductions.child_id
        and c.user_id = auth.uid()
    )
  );
