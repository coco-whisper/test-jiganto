alter table public.view_preferences
  add column if not exists calendar_config jsonb not null default '{}'::jsonb;
