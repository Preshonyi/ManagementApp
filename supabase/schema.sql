create extension if not exists "pgcrypto";

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in-progress', 'completed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  deadline timestamptz,
  reminder_at timestamptz,
  assigned_to text,
  shared_with text,
  attachment_url text,
  attachment_name text,
  created_by text not null,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_created_by_idx on public.tasks (created_by);
create index if not exists tasks_assigned_to_idx on public.tasks (assigned_to);
create index if not exists tasks_deadline_idx on public.tasks (deadline);
create index if not exists tasks_status_idx on public.tasks (status);

alter table public.tasks enable row level security;

-- This app uses Firebase Authentication on the client, so Supabase cannot verify
-- Firebase users through auth.uid() without a custom JWT bridge. For a student
-- prototype, these policies allow the anon key to operate on the task table.
-- Tighten these before production by adding Supabase Auth or Firebase custom JWTs.
drop policy if exists "prototype_read_tasks" on public.tasks;
drop policy if exists "prototype_insert_tasks" on public.tasks;
drop policy if exists "prototype_update_tasks" on public.tasks;
drop policy if exists "prototype_delete_tasks" on public.tasks;

create policy "prototype_read_tasks"
  on public.tasks for select
  to anon, authenticated
  using (true);

create policy "prototype_insert_tasks"
  on public.tasks for insert
  to anon, authenticated
  with check (true);

create policy "prototype_update_tasks"
  on public.tasks for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "prototype_delete_tasks"
  on public.tasks for delete
  to anon, authenticated
  using (true);

insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', true)
on conflict (id) do nothing;

create policy "prototype_public_attachment_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'task-attachments');

create policy "prototype_attachment_upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'task-attachments');
