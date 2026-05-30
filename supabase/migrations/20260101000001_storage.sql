-- Storage bucket for task attachments (25 MB per file enforced in app + optional DB check)

insert into storage.buckets (id, name, public, file_size_limit)
values (
  'task-attachments',
  'task-attachments',
  false,
  26214400
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit;

-- Authenticated users can read attachments in their org (path: org_id/task_id/filename)
create policy "Org members read task attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy "Org members upload task attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy "Org members update task attachments"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy "Org members delete task attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );
