alter table public.view_preferences
  add column if not exists timeline_config jsonb not null default '{}'::jsonb;
