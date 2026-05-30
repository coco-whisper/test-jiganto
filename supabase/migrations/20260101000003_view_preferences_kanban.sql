-- Kanban WIP limits and per-view kanban settings (per user / project)
alter table public.view_preferences
  add column if not exists kanban_config jsonb not null default '{}'::jsonb;
