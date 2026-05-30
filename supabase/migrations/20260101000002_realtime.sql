-- Enable Supabase Realtime for tasks (org-scoped client subscriptions)
alter publication supabase_realtime add table public.tasks;
