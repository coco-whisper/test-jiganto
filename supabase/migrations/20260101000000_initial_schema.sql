-- Jiganto Tasks — Phase 0 schema
-- Run via Supabase SQL editor or: supabase db push

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.task_status as enum (
  'new',
  'in_progress',
  'pending',
  'delayed',
  'completed',
  'cancelled'
);

create type public.task_priority as enum ('high', 'medium', 'low');

create type public.custom_field_type as enum (
  'text',
  'longtext',
  'number',
  'date',
  'checkbox',
  'select',
  'multi_select',
  'person',
  'rating',
  'url'
);

create type public.view_mode as enum (
  'table',
  'kanban',
  'timeline',
  'calendar',
  'board'
);

-- ---------------------------------------------------------------------------
-- Organisations
-- ---------------------------------------------------------------------------
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete restrict,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_org_id_idx on public.profiles (org_id);

-- ---------------------------------------------------------------------------
-- Clients (stub CRM)
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  name text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

create index clients_org_id_idx on public.clients (org_id);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  name varchar(255) not null,
  status public.task_status not null default 'new',
  client_id uuid references public.clients (id) on delete set null,
  start_date date,
  due_date date,
  is_archived boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_org_id_idx on public.projects (org_id);

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  name varchar(255) not null,
  status public.task_status not null default 'new',
  priority public.task_priority,
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  start_date date,
  due_date date,
  description text,
  client_id uuid references public.clients (id) on delete set null,
  position double precision not null default 0,
  is_archived boolean not null default false,
  custom_data jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_org_id_idx on public.tasks (org_id);
create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_status_idx on public.tasks (status);

-- ---------------------------------------------------------------------------
-- Task members (many-to-many)
-- ---------------------------------------------------------------------------
create table public.task_members (
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create index task_members_user_id_idx on public.task_members (user_id);

-- ---------------------------------------------------------------------------
-- Custom columns
-- ---------------------------------------------------------------------------
create table public.custom_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  name varchar(100) not null,
  field_type public.custom_field_type not null,
  options jsonb not null default '[]'::jsonb,
  config jsonb not null default '{}'::jsonb,
  position int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index custom_columns_project_id_idx on public.custom_columns (project_id);
create index custom_columns_org_id_idx on public.custom_columns (org_id);

-- ---------------------------------------------------------------------------
-- Sub-tasks
-- ---------------------------------------------------------------------------
create table public.sub_tasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  name varchar(255) not null,
  is_done boolean not null default false,
  assignee_id uuid references public.profiles (id) on delete set null,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

create index sub_tasks_task_id_idx on public.sub_tasks (task_id);

-- ---------------------------------------------------------------------------
-- Comments (threaded)
-- ---------------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_task_id_idx on public.comments (task_id);

-- ---------------------------------------------------------------------------
-- Time logs
-- ---------------------------------------------------------------------------
create table public.time_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  duration_mins int not null check (duration_mins >= 0),
  description text,
  logged_by uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index time_logs_task_id_idx on public.time_logs (task_id);

-- ---------------------------------------------------------------------------
-- Attachments
-- ---------------------------------------------------------------------------
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index attachments_task_id_idx on public.attachments (task_id);

-- ---------------------------------------------------------------------------
-- View preferences (per user, per project or standalone list)
-- ---------------------------------------------------------------------------
create table public.view_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  view_mode public.view_mode not null default 'table',
  group_by text not null default 'status',
  sort_config jsonb not null default '[]'::jsonb,
  hidden_columns jsonb not null default '[]'::jsonb,
  filters jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, project_id)
);

create index view_preferences_user_id_idx on public.view_preferences (user_id);

-- ---------------------------------------------------------------------------
-- Notifications (@mentions, etc.)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id);

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

create trigger view_preferences_set_updated_at
  before update on public.view_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth: auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org_id uuid;
begin
  target_org_id := nullif(new.raw_user_meta_data ->> 'org_id', '')::uuid;

  if target_org_id is null then
    select id into target_org_id from public.organisations order by created_at limit 1;
  end if;

  if target_org_id is null then
    insert into public.organisations (name)
    values ('Default Organisation')
    returning id into target_org_id;
  end if;

  insert into public.profiles (id, org_id, email, display_name)
  values (
    new.id,
    target_org_id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_org_member(check_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and org_id = check_org_id
  )
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organisations enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_members enable row level security;
alter table public.custom_columns enable row level security;
alter table public.sub_tasks enable row level security;
alter table public.comments enable row level security;
alter table public.time_logs enable row level security;
alter table public.attachments enable row level security;
alter table public.view_preferences enable row level security;
alter table public.notifications enable row level security;

-- organisations
create policy "Users read their organisation"
  on public.organisations for select
  using (id = public.current_org_id());

-- profiles
create policy "Users read profiles in their org"
  on public.profiles for select
  using (org_id = public.current_org_id());

create policy "Users update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- clients
create policy "Org members manage clients"
  on public.clients for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- projects
create policy "Org members manage projects"
  on public.projects for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- tasks
create policy "Org members manage tasks"
  on public.tasks for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- task_members
create policy "Org members manage task members"
  on public.task_members for all
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_members.task_id
        and t.org_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_members.task_id
        and t.org_id = public.current_org_id()
    )
  );

-- custom_columns
create policy "Org members manage custom columns"
  on public.custom_columns for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- sub_tasks
create policy "Org members manage sub tasks"
  on public.sub_tasks for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- comments
create policy "Org members manage comments"
  on public.comments for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- time_logs
create policy "Org members manage time logs"
  on public.time_logs for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- attachments
create policy "Org members manage attachments"
  on public.attachments for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- view_preferences
create policy "Users manage their view preferences"
  on public.view_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- notifications
create policy "Users read their notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users update their notifications"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Org members create notifications"
  on public.notifications for insert
  with check (org_id = public.current_org_id());
