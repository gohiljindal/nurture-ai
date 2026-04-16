-- Vaccination tracking per child (Canadian provinces / territories).
-- Uses public.update_updated_at_column() from 20240201_milestones.sql.
--
-- Note: PostgreSQL requires immutable expressions for GENERATED STORED columns.
-- Comparisons to CURRENT_DATE are not immutable, so is_overdue is maintained
-- by a BEFORE INSERT/UPDATE trigger using:
--   administered_at is null and scheduled_date < current_date
-- (COALESCE to false when the expression is NULL, e.g. scheduled_date is null.)

-- ---------------------------------------------------------------------------
-- children.province (optional profile field)
-- ---------------------------------------------------------------------------
alter table public.children add column if not exists province text;

comment on column public.children.province is
  'Canadian province or territory (2-letter code), e.g. ON, BC.';

-- ---------------------------------------------------------------------------
-- child_vaccines
-- ---------------------------------------------------------------------------
create table public.child_vaccines (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  vaccine_code text not null,
  vaccine_name text not null,
  province text not null
    check (
      province in (
        'ON',
        'BC',
        'AB',
        'SK',
        'MB',
        'QC',
        'NB',
        'NS',
        'PE',
        'NL',
        'YT',
        'NT',
        'NU'
      )
    ),
  scheduled_date date,
  administered_at date,
  administered_by text,
  lot_number text,
  notes text,
  is_overdue boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index child_vaccines_child_id_idx on public.child_vaccines (child_id);

create index child_vaccines_child_id_province_idx
  on public.child_vaccines (child_id, province);

comment on table public.child_vaccines is
  'Parent-recorded immunizations—informational, not an official immunization record.';

create or replace function public.child_vaccines_set_is_overdue()
returns trigger
language plpgsql
as $$
begin
  new.is_overdue := coalesce(
    new.administered_at is null and new.scheduled_date < current_date,
    false
  );
  return new;
end;
$$;

create trigger child_vaccines_set_is_overdue
  before insert or update of administered_at, scheduled_date
  on public.child_vaccines
  for each row
  execute function public.child_vaccines_set_is_overdue();

create trigger child_vaccines_set_updated_at
  before update on public.child_vaccines
  for each row
  execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS (same ownership pattern as child_milestones)
-- ---------------------------------------------------------------------------
alter table public.child_vaccines enable row level security;

create policy "child_vaccines_select_own"
  on public.child_vaccines
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = child_vaccines.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "child_vaccines_insert_own"
  on public.child_vaccines
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.children c
      where c.id = child_vaccines.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "child_vaccines_update_own"
  on public.child_vaccines
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = child_vaccines.child_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.children c
      where c.id = child_vaccines.child_id
        and c.user_id = auth.uid()
    )
  );

create policy "child_vaccines_delete_own"
  on public.child_vaccines
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = child_vaccines.child_id
        and c.user_id = auth.uid()
    )
  );
