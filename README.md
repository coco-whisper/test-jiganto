# Jiganto Task Tracker

Basic Task Tracker demo for Jiganto — built with Next.js, Supabase, and shadcn/ui.

## Phase 0 — Foundation

This phase includes:

- Supabase schema, RLS, and `task-attachments` storage bucket (25 MB limit)
- Email/password and magic-link auth
- Protected `/tasks` and `/projects/[id]` routes
- App shell with Portfolio → Tasks sidebar
- `POST /api/tasks` to create tasks

## Phase 1 — CRUD API + data layer

All endpoints require an authenticated session (org-scoped via RLS).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/tasks` | List/create tasks (`?mine=true`, `?standalone=true`, `?include_archived=true`) |
| GET/PATCH/DELETE | `/api/tasks/[id]` | Read/update/archive task (`DELETE` soft-archives; `?hard=true` hard-deletes) |
| GET/POST | `/api/projects` | List/create light projects |
| GET/POST | `/api/columns` | List/create custom columns (max 10 per list) |
| PATCH/DELETE | `/api/columns/[id]` | Update/delete column |
| GET/POST | `/api/sub-tasks` | List/create sub-tasks (`?task_id=`) |
| PATCH/DELETE | `/api/sub-tasks/[id]` | Update/delete sub-task (syncs task progress) |
| GET/POST | `/api/comments` | List/create threaded comments (`?task_id=`) |
| PATCH/DELETE | `/api/comments/[id]` | Edit/delete own comments |
| GET/POST | `/api/time-logs` | List/create time logs; `stop_timer: true` stops running timer |
| GET/POST | `/api/attachments` | List/upload files (`FormData`: `task_id`, `file`) |
| GET/PATCH | `/api/view-preferences` | Read/upsert view prefs (`?project_id=` or standalone) |

**Business logic:**

- Progress auto-calculates from sub-tasks when any exist; otherwise manual `progress` (0–100)
- Completed tasks auto-archive after 7 days (on task list fetch)
- Task reorder via `after_id` / `before_id` (fractional `position`)
- Status colors in `src/lib/tasks/constants.ts`

Shared helpers live in `src/lib/tasks/` and `src/lib/api/http.ts`.

## Phase 2 — Toolbar + shared task state

- **`TaskToolbar`** — search, view switcher, filters, group-by, sort, archived toggle, edit view, import/export stubs, add task
- **`useTasks()`** — React Query fetch/mutations with cache invalidation
- **`useViewPreferences()`** — persisted view/group/sort/filter/hidden columns
- **`useTasksRealtime()`** — Supabase Realtime invalidates task queries on org changes
- **`TaskWorkspace`** — wires toolbar + table preview (other views show Phase 5 placeholder)

Run the Realtime migration:

```sql
-- supabase/migrations/20260101000002_realtime.sql
alter publication supabase_realtime add table public.tasks;
```

Keyboard shortcuts: **`N`** add task, **`Esc`** clear search.

## Phase 3 — Table view

- TanStack Table headers with sort indicators (synced to view preferences)
- Groups by status (all six status bands) or any group-by column
- Inline editors: name, status, progress, members, client, due date, priority
- Ultra-fast entry: draft row at bottom of group (`N`, toolbar **+**, or **Add task** in group)
- Drag handle reorder within group (fractional `position` via API)
- ↗ opens task detail sheet stub (Phase 6 placeholder)

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in values from **Supabase → Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Run database migrations

In the Supabase **SQL Editor**, run these files in order:

1. `supabase/migrations/20260101000000_initial_schema.sql`
2. `supabase/migrations/20260101000001_storage.sql`

Or, if using the Supabase CLI:

```bash
supabase db push
```

### 4. Enable auth providers

In **Supabase → Authentication → Providers**:

- Enable **Email**
- For demo: disable “Confirm email” or use the seed script (which confirms users)

Add `http://localhost:3000/auth/callback` to **Redirect URLs**.

### 5. Seed demo data

```bash
npm run db:seed
```

Creates:

- Organisation: **Jiganto Demo Org**
- Users: 8 demo accounts `@demo.jiganto.app` (password: `Demo123!`)
- Clients: **Acme Corp**, **Northwind Trading**, **Globex Industries**, and others
- Projects: **Website Redesign**, **Mobile App MVP**, **Brand Refresh**, **ERP Integration**
- ~72 tasks, sub-tasks, comments, and custom columns for realistic local testing

### 6. Start the app

```bash
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login).

## Exit criteria (Phase 0)

1. Sign in with a demo user
2. Open **Portfolio → Tasks** — empty task list
3. Click **Add task** or call the API:

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"name":"My first task"}'
```

## Project structure

```
src/
  app/
    (app)/              # Authenticated shell
      tasks/            # Standalone task lists
      projects/[id]/    # Project-scoped tasks
    api/                  # Full CRUD route handlers
    auth/callback/      # Magic link handler
    login/
  components/
    auth/
    layout/             # Sidebar shell
    tasks/
  lib/
    supabase/           # Browser + server clients
    auth/
supabase/
  migrations/           # Schema + storage policies
scripts/
  seed-demo.mjs         # Demo org/users/project
```

## Next phases

See the implementation roadmap: Table view, Kanban, Timeline, Calendar, custom columns, task detail panel, import/export.
