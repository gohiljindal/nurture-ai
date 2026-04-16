-- Sleep logs and safe-sleep checklist items per child.
-- Uses public.update_updated_at_column() from 20240201_milestones.sql.

-- ---------------------------------------------------------------------------
-- sleep_logs
-- ---------------------------------------------------------------------------
create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  sleep_start timestamptz not null,
  sleep_end timestamptz,
  sleep_type text not null default 'nap'
    check (sleep_type in ('nap', 'night', 'unknown')),
  location text
    check (
      location is null
      or location in ('crib', 'bassinet', 'contact', 'car', 'stroller')
    ),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index sleep_logs_child_id_sleep_start_idx
  on public.sleep_logs (child_id, sleep_start desc);

comment on table public.sleep_logs is
  'Parent-logged sleep intervals—informational, not a clinical record.';

create trigger sleep_logs_set_updated_at
  before update on public.sleep_logs
  for each row
  execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- safe_sleep_checklist
-- ---------------------------------------------------------------------------
create table public.safe_sleep_checklist (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  item_code text not null,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique (child_id, item_code)
);

create index safe_sleep_checklist_child_id_idx
  on public.safe_sleep_checklist (child_id);

comment on table public.safe_sleep_checklist is
  'Per-child safe sleep checklist progress—informational, not a clinical record.';

-- ---------------------------------------------------------------------------
-- RLS (same ownership pattern as child_milestones)
-- ---------------------------------------------------------------------------
alter table public.sleep_logs enable row level security;

create policy "sleep_logs_select_own"
  on public.sleep_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = sleep_logs.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "sleep_logs_insert_own"
  on public.sleep_logs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.children c
      where c.id = sleep_logs.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "sleep_logs_update_own"
  on public.sleep_logs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = sleep_logs.child_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.children c
      where c.id = sleep_logs.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "sleep_logs_delete_own"
  on public.sleep_logs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = sleep_logs.child_id
        and c.user_id = auth.uid()
    )
  );

alter table public.safe_sleep_checklist enable row level security;

create policy "safe_sleep_checklist_select_own"
  on public.safe_sleep_checklist
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = safe_sleep_checklist.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "safe_sleep_checklist_insert_own"
  on public.safe_sleep_checklist
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.children c
      where c.id = safe_sleep_checklist.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "safe_sleep_checklist_update_own"
  on public.safe_sleep_checklist
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = safe_sleep_checklist.child_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.children c
      where c.id = safe_sleep_checklist.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "safe_sleep_checklist_delete_own"
  on public.safe_sleep_checklist
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = safe_sleep_checklist.child_id
        and c.user_id = auth.uid()
    )
  );
