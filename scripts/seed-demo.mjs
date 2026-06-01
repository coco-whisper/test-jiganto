#!/usr/bin/env node

/**
 * Seeds demo org, users, clients, projects, tasks, sub-tasks, and comments.
 *
 * Target volume (ideal demo):
 *   8 users · 5 clients · 4 projects · ~72 tasks · ~62 sub-tasks · ~62 comments
 *
 * Prerequisites:
 * 1. Run supabase/migrations/*.sql in your Supabase project (SQL editor or CLI)
 * 2. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Usage: npm run db:seed
 *
 * Re-running: if an older seed left fewer than 60 tasks, those tasks are cleared
 * and replaced with the full dataset. At 60+ tasks and 40+ comments, task seeding
 * is skipped.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  const contents = readFileSync(envPath, "utf8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEMO_PASSWORD = "Demo123!";
const ORG_NAME = "Jiganto Demo Org";
const SEED_TASK_THRESHOLD = 60;
const SEED_COMMENT_THRESHOLD = 40;

const demoUsers = [
  { email: "alex@demo.jiganto.app", display_name: "Alex Chen" },
  { email: "sam@demo.jiganto.app", display_name: "Sam Rivera" },
  { email: "jordan@demo.jiganto.app", display_name: "Jordan Lee" },
  { email: "riley@demo.jiganto.app", display_name: "Riley Patel" },
  { email: "casey@demo.jiganto.app", display_name: "Casey Morgan" },
  { email: "morgan@demo.jiganto.app", display_name: "Morgan Brooks" },
  { email: "taylor@demo.jiganto.app", display_name: "Taylor Kim" },
  { email: "devon@demo.jiganto.app", display_name: "Devon Wright" },
];

const demoClients = [
  "Acme Corp",
  "Northwind Trading",
  "Globex Industries",
  "Initech Solutions",
  "Stark Media Group",
];

const demoProjects = [
  {
    name: "Website Redesign",
    client: "Acme Corp",
    status: "in_progress",
    start_date: "2026-03-01",
    due_date: "2026-06-30",
  },
  {
    name: "Mobile App MVP",
    client: "Globex Industries",
    status: "in_progress",
    start_date: "2026-04-01",
    due_date: "2026-07-15",
  },
  {
    name: "Brand Refresh",
    client: "Stark Media Group",
    status: "pending",
    start_date: "2026-05-01",
    due_date: "2026-08-30",
  },
  {
    name: "ERP Integration",
    client: "Northwind Trading",
    status: "new",
    start_date: "2026-06-01",
    due_date: "2026-09-30",
  },
];

const standaloneTaskDefs = [
  { name: "Review quarterly goals", status: "new", priority: "medium", due_date: "2026-06-15", custom: { "Story Points": 3, Department: "Ops" } },
  { name: "Update team wiki", status: "in_progress", priority: "low", due_date: "2026-06-02", custom: { "Story Points": 2, Department: "Engineering" } },
  { name: "Plan sprint retro", status: "pending", priority: "medium", due_date: "2026-06-08", custom: { "Story Points": 1, Department: "Ops" } },
  { name: "Fix login redirect bug", status: "delayed", priority: "high", due_date: "2026-05-28", custom: { "Story Points": 5, Department: "Engineering" } },
  { name: "Draft onboarding checklist", status: "completed", priority: "medium", due_date: "2026-05-20", custom: { "Story Points": 3, Department: "Ops" } },
  { name: "Research competitor pricing", status: "new", priority: "low", due_date: "2026-06-20", custom: { "Story Points": 2, Department: "Design" } },
  { name: "Schedule design critique", status: "in_progress", priority: "medium", due_date: "2026-06-05", custom: { "Story Points": 1, Department: "Design" } },
  { name: "Clean up stale branches", status: "cancelled", priority: "low", custom: { Department: "Engineering" } },
  { name: "Prepare demo script", status: "pending", priority: "high", due_date: "2026-06-12", custom: { "Story Points": 4, Department: "Design" } },
  { name: "Audit notification emails", status: "new", priority: "medium", due_date: "2026-06-18", custom: { "Story Points": 3, Department: "Engineering" } },
  { name: "Document API endpoints", status: "in_progress", priority: "medium", start_date: "2026-05-25", due_date: "2026-06-10", custom: { "Story Points": 5, Department: "Engineering" } },
  { name: "Organise shared drive", status: "new", priority: "low", custom: { "Story Points": 2, Department: "Ops" } },
  { name: "Review security policies", status: "pending", priority: "high", due_date: "2026-06-25", custom: { "Story Points": 3, Department: "Ops" } },
  { name: "Update npm dependencies", status: "in_progress", priority: "medium", due_date: "2026-06-09", custom: { "Story Points": 2, Department: "Engineering" } },
  { name: "Plan team offsite", status: "new", priority: "low", due_date: "2026-07-01", custom: { "Story Points": 1, Department: "Ops" } },
  { name: "Migrate CI pipeline", status: "in_progress", priority: "medium", start_date: "2026-05-20", due_date: "2026-06-14", custom: { "Story Points": 5, Department: "Engineering" } },
  { name: "Interview candidate debrief", status: "completed", priority: "medium", due_date: "2026-05-18", custom: { "Story Points": 1, Department: "Ops" } },
  { name: "Refactor auth middleware", status: "delayed", priority: "high", due_date: "2026-06-03", custom: { "Story Points": 8, Department: "Engineering" } },
  { name: "Create style guide updates", status: "new", priority: "medium", due_date: "2026-06-22", custom: { "Story Points": 3, Department: "Design" } },
  { name: "Vendor contract renewal", status: "pending", priority: "high", due_date: "2026-06-11", custom: { "Story Points": 2, Department: "Ops" } },
  { name: "Backup verification run", status: "completed", priority: "low", due_date: "2026-05-10", custom: { "Story Points": 1, Department: "Engineering" } },
  { name: "Software license audit", status: "new", priority: "medium", due_date: "2026-06-28", custom: { "Story Points": 4, Department: "Ops" } },
  { name: "Customer feedback synthesis", status: "in_progress", priority: "medium", due_date: "2026-06-17", custom: { "Story Points": 3, Department: "Design" } },
  { name: "KPI dashboard tweaks", status: "new", priority: "low", due_date: "2026-06-24", custom: { "Story Points": 2, Department: "Design" } },
  { name: "Fix flaky E2E test", status: "in_progress", priority: "high", due_date: "2026-06-06", custom: { "Story Points": 5, Department: "Engineering" } },
  { name: "Knowledge base restructure", status: "pending", priority: "low", due_date: "2026-07-05", custom: { "Story Points": 3, Department: "Ops" } },
  { name: "Email template refresh", status: "new", priority: "medium", due_date: "2026-06-19", custom: { "Story Points": 2, Department: "Design" } },
  { name: "Quarterly budget review", status: "pending", priority: "high", due_date: "2026-06-30", custom: { "Story Points": 4, Department: "Ops" } },
];

const projectTaskDefs = {
  "Website Redesign": [
    { name: "Homepage hero redesign", status: "in_progress", priority: "high", start_date: "2026-03-10", due_date: "2026-05-30", custom: { "Estimate (hrs)": 24, Phase: "Build" } },
    { name: "Client sign-off on wireframes", status: "pending", priority: "high", due_date: "2026-06-05", custom: { "Estimate (hrs)": 8, Phase: "Discovery" } },
    { name: "Implement responsive nav", status: "in_progress", priority: "medium", start_date: "2026-05-01", due_date: "2026-06-15", custom: { "Estimate (hrs)": 16, Phase: "Build" } },
    { name: "Performance audit", status: "new", priority: "medium", due_date: "2026-06-22", custom: { "Estimate (hrs)": 12, Phase: "Launch" } },
    { name: "Content migration", status: "delayed", priority: "high", due_date: "2026-05-25", custom: { "Estimate (hrs)": 20, Phase: "Build" } },
    { name: "SEO metadata pass", status: "completed", priority: "medium", due_date: "2026-05-15", custom: { "Estimate (hrs)": 6, Phase: "Launch" } },
    { name: "Accessibility review", status: "pending", priority: "high", due_date: "2026-06-18", custom: { "Estimate (hrs)": 10, Phase: "Launch" } },
    { name: "Launch checklist", status: "new", priority: "medium", due_date: "2026-06-28", custom: { "Estimate (hrs)": 4, Phase: "Launch" } },
    { name: "Dark mode toggle", status: "in_progress", priority: "medium", due_date: "2026-06-12", custom: { "Estimate (hrs)": 10, Phase: "Build" } },
    { name: "Footer legal pages", status: "new", priority: "low", due_date: "2026-06-20", custom: { "Estimate (hrs)": 4, Phase: "Launch" } },
    { name: "Analytics event mapping", status: "pending", priority: "medium", due_date: "2026-06-16", custom: { "Estimate (hrs)": 8, Phase: "Launch" } },
  ],
  "Mobile App MVP": [
    { name: "Push notification setup", status: "in_progress", priority: "high", due_date: "2026-06-10", custom: { "Estimate (hrs)": 12, Phase: "Build" } },
    { name: "Onboarding flow screens", status: "in_progress", priority: "high", start_date: "2026-04-15", due_date: "2026-06-08", custom: { "Estimate (hrs)": 20, Phase: "Discovery" } },
    { name: "Biometric login", status: "pending", priority: "medium", due_date: "2026-06-25", custom: { "Estimate (hrs)": 8, Phase: "Build" } },
    { name: "Offline cache layer", status: "new", priority: "high", due_date: "2026-07-01", custom: { "Estimate (hrs)": 16, Phase: "Build" } },
    { name: "App store assets", status: "pending", priority: "medium", due_date: "2026-06-30", custom: { "Estimate (hrs)": 6, Phase: "Launch" } },
    { name: "Beta tester feedback triage", status: "in_progress", priority: "medium", due_date: "2026-06-14", custom: { "Estimate (hrs)": 4, Phase: "Discovery" } },
    { name: "Crash reporting integration", status: "completed", priority: "medium", due_date: "2026-05-20", custom: { "Estimate (hrs)": 5, Phase: "Build" } },
    { name: "Deep linking routes", status: "new", priority: "medium", due_date: "2026-06-28", custom: { "Estimate (hrs)": 10, Phase: "Build" } },
    { name: "Performance profiling", status: "delayed", priority: "high", due_date: "2026-06-05", custom: { "Estimate (hrs)": 8, Phase: "Launch" } },
    { name: "Push permission UX copy", status: "new", priority: "low", due_date: "2026-06-18", custom: { "Estimate (hrs)": 3, Phase: "Discovery" } },
    { name: "Release candidate build", status: "pending", priority: "high", due_date: "2026-07-10", custom: { "Estimate (hrs)": 6, Phase: "Launch" } },
  ],
  "Brand Refresh": [
    { name: "Logo variations export", status: "in_progress", priority: "high", due_date: "2026-06-15", custom: { "Estimate (hrs)": 10, Phase: "Discovery" } },
    { name: "Typography system", status: "in_progress", priority: "medium", due_date: "2026-06-20", custom: { "Estimate (hrs)": 12, Phase: "Build" } },
    { name: "Color palette finalization", status: "pending", priority: "high", due_date: "2026-06-12", custom: { "Estimate (hrs)": 6, Phase: "Discovery" } },
    { name: "Brand guidelines PDF", status: "new", priority: "medium", due_date: "2026-07-05", custom: { "Estimate (hrs)": 16, Phase: "Build" } },
    { name: "Social media templates", status: "new", priority: "medium", due_date: "2026-06-28", custom: { "Estimate (hrs)": 8, Phase: "Build" } },
    { name: "Presentation deck template", status: "pending", priority: "low", due_date: "2026-07-01", custom: { "Estimate (hrs)": 6, Phase: "Build" } },
    { name: "Business card design", status: "completed", priority: "low", due_date: "2026-05-25", custom: { "Estimate (hrs)": 4, Phase: "Discovery" } },
    { name: "Email signature standards", status: "new", priority: "low", due_date: "2026-06-22", custom: { "Estimate (hrs)": 3, Phase: "Launch" } },
    { name: "Merchandise mockups", status: "in_progress", priority: "medium", due_date: "2026-06-30", custom: { "Estimate (hrs)": 10, Phase: "Build" } },
    { name: "Client pitch deck", status: "pending", priority: "high", due_date: "2026-06-18", custom: { "Estimate (hrs)": 12, Phase: "Launch" } },
    { name: "Photography art direction", status: "new", priority: "medium", due_date: "2026-07-08", custom: { "Estimate (hrs)": 8, Phase: "Discovery" } },
  ],
  "ERP Integration": [
    { name: "Requirements workshop", status: "completed", priority: "high", due_date: "2026-06-01", custom: { "Estimate (hrs)": 8, Phase: "Discovery" } },
    { name: "Data mapping document", status: "in_progress", priority: "high", due_date: "2026-06-20", custom: { "Estimate (hrs)": 16, Phase: "Discovery" } },
    { name: "API authentication setup", status: "in_progress", priority: "high", due_date: "2026-06-15", custom: { "Estimate (hrs)": 10, Phase: "Build" } },
    { name: "Sync job scheduler", status: "pending", priority: "medium", due_date: "2026-07-01", custom: { "Estimate (hrs)": 12, Phase: "Build" } },
    { name: "Error handling dashboard", status: "new", priority: "medium", due_date: "2026-07-10", custom: { "Estimate (hrs)": 14, Phase: "Build" } },
    { name: "Staging environment parity", status: "delayed", priority: "high", due_date: "2026-06-12", custom: { "Estimate (hrs)": 8, Phase: "Build" } },
    { name: "User acceptance testing", status: "new", priority: "high", due_date: "2026-08-01", custom: { "Estimate (hrs)": 20, Phase: "Launch" } },
    { name: "Rollback procedure", status: "pending", priority: "medium", due_date: "2026-07-15", custom: { "Estimate (hrs)": 6, Phase: "Launch" } },
    { name: "Training materials", status: "new", priority: "low", due_date: "2026-08-10", custom: { "Estimate (hrs)": 10, Phase: "Launch" } },
    { name: "Go-live checklist", status: "new", priority: "high", due_date: "2026-08-20", custom: { "Estimate (hrs)": 4, Phase: "Launch" } },
    { name: "Post-launch monitoring", status: "new", priority: "medium", due_date: "2026-09-01", custom: { "Estimate (hrs)": 8, Phase: "Launch" } },
  ],
};

function paragraph(text) {
  return `<p>${text}</p>`;
}

function mentionParagraph(text, userId, label) {
  return `<p>${text} <span data-mention-id="${userId}">@${label}</span></p>`;
}

async function findOrCreateOrg() {
  const { data: existing } = await supabase
    .from("organisations")
    .select("id")
    .eq("name", ORG_NAME)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data, error } = await supabase
    .from("organisations")
    .insert({ name: ORG_NAME })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create organisation: ${error.message}`);
  }

  return data.id;
}

async function findOrCreateUser(orgId, user) {
  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const existing = listData.users.find(
    (authUser) => authUser.email?.toLowerCase() === user.email.toLowerCase(),
  );

  if (existing) {
    await supabase
      .from("profiles")
      .update({
        org_id: orgId,
        display_name: user.display_name,
        email: user.email,
      })
      .eq("id", existing.id);

    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      org_id: orgId,
      display_name: user.display_name,
    },
  });

  if (error) {
    throw new Error(`Failed to create user ${user.email}: ${error.message}`);
  }

  return data.user.id;
}

async function findOrCreateClients(orgId) {
  const clientIds = {};

  for (const name of demoClients) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("org_id", orgId)
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      clientIds[name] = existing.id;
      continue;
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({ org_id: orgId, name })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to create client ${name}: ${error.message}`);
    }

    clientIds[name] = data.id;
  }

  return clientIds;
}

async function findOrCreateProjects(orgId, clientIds, createdBy) {
  const projects = [];

  for (const definition of demoProjects) {
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("org_id", orgId)
      .eq("name", definition.name)
      .maybeSingle();

    if (existing) {
      projects.push({
        id: existing.id,
        name: definition.name,
        clientId: clientIds[definition.client],
      });
      continue;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        org_id: orgId,
        name: definition.name,
        status: definition.status,
        client_id: clientIds[definition.client],
        start_date: definition.start_date,
        due_date: definition.due_date,
        created_by: createdBy,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(
        `Failed to create project ${definition.name}: ${error.message}`,
      );
    }

    projects.push({
      id: data.id,
      name: definition.name,
      clientId: clientIds[definition.client],
    });
  }

  return projects;
}

async function countForOrg(table, orgId) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  if (error) {
    throw new Error(`Failed to count ${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function hasSeededTasks(orgId) {
  return (await countForOrg("tasks", orgId)) >= SEED_TASK_THRESHOLD;
}

async function hasSeededComments(orgId) {
  return (await countForOrg("comments", orgId)) >= SEED_COMMENT_THRESHOLD;
}

async function clearPartialTaskSeed(orgId) {
  const taskCount = await countForOrg("tasks", orgId);

  if (taskCount > 0 && taskCount < SEED_TASK_THRESHOLD) {
    console.log(
      `  Found ${taskCount} tasks from an older seed; clearing before re-seeding...`,
    );
    const { error } = await supabase.from("tasks").delete().eq("org_id", orgId);
    if (error) {
      throw new Error(`Failed to clear old tasks: ${error.message}`);
    }
  }
}

async function findOrCreateCustomColumns(orgId, projectId) {
  const scopeKey = projectId ?? "standalone";
  const definitions = projectId
    ? [
        {
          name: "Estimate (hrs)",
          field_type: "number",
          config: { format: "integer", suffix: "h" },
        },
        {
          name: "Phase",
          field_type: "select",
          options: [
            { label: "Discovery", color: "#3b82f6" },
            { label: "Build", color: "#059669" },
            { label: "Launch", color: "#d97706" },
          ],
        },
      ]
    : [
        {
          name: "Story Points",
          field_type: "number",
          config: { format: "integer" },
        },
        {
          name: "Department",
          field_type: "select",
          options: [
            { label: "Engineering", color: "#6366f1" },
            { label: "Design", color: "#ec4899" },
            { label: "Ops", color: "#64748b" },
          ],
        },
      ];

  const columnIds = {};

  for (const [index, definition] of definitions.entries()) {
    let query = supabase
      .from("custom_columns")
      .select("id")
      .eq("org_id", orgId)
      .eq("name", definition.name);

    if (projectId) {
      query = query.eq("project_id", projectId);
    } else {
      query = query.is("project_id", null);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      columnIds[definition.name] = existing.id;
      continue;
    }

    const { data, error } = await supabase
      .from("custom_columns")
      .insert({
        org_id: orgId,
        project_id: projectId,
        name: definition.name,
        field_type: definition.field_type,
        options: definition.options ?? [],
        config: definition.config ?? {},
        position: index,
        is_visible: true,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(
        `Failed to create column ${definition.name} (${scopeKey}): ${error.message}`,
      );
    }

    columnIds[definition.name] = data.id;
  }

  return columnIds;
}

function buildCustomData(task, columnMap) {
  const custom_data = {};
  for (const [label, value] of Object.entries(task.custom ?? {})) {
    const columnId = columnMap[label];
    if (columnId) custom_data[columnId] = value;
  }
  return custom_data;
}

function taskProgress(task, index) {
  if (task.status === "completed") return 100;
  if (task.status === "in_progress") return 20 + (index % 4) * 15;
  if (task.status === "delayed") return 10 + (index % 3) * 10;
  return index % 5 === 0 ? 40 : 0;
}

async function seedTasks(orgId, projects, userIds, standaloneColumns, projectColumnMaps) {
  const batches = [
    {
      tasks: standaloneTaskDefs,
      project_id: null,
      client_id: null,
      columnMap: standaloneColumns,
    },
    ...projects.map((project) => ({
      tasks: projectTaskDefs[project.name] ?? [],
      project_id: project.id,
      client_id: project.clientId,
      columnMap: projectColumnMaps[project.id],
    })),
  ];

  const createdTasks = [];
  let globalIndex = 0;

  for (const batch of batches) {
    let position = 0;

    for (const [index, task] of batch.tasks.entries()) {
      position += 1000;

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          org_id: orgId,
          project_id: batch.project_id,
          name: task.name,
          status: task.status,
          priority: task.priority ?? null,
          due_date: task.due_date ?? null,
          start_date: task.start_date ?? null,
          client_id: batch.client_id,
          progress: taskProgress(task, globalIndex),
          custom_data: buildCustomData(task, batch.columnMap),
          created_by: userIds[globalIndex % userIds.length],
          position,
          is_archived: task.status === "completed" && index % 5 === 0,
        })
        .select("id, name")
        .single();

      if (error) {
        throw new Error(`Failed to create task "${task.name}": ${error.message}`);
      }

      createdTasks.push({ ...data, globalIndex });
      globalIndex += 1;
    }
  }

  return createdTasks;
}

function memberIdsForTask(index, userIds) {
  const roll = index % 10;
  const count = roll < 3 ? 1 : roll < 8 ? 2 : 3;
  const members = [];

  for (let offset = 0; members.length < count; offset += 1) {
    const userId = userIds[(index + offset) % userIds.length];
    if (!members.includes(userId)) {
      members.push(userId);
    }
  }

  return members;
}

async function seedTaskMembers(tasks, userIds) {
  for (const task of tasks) {
    const rows = memberIdsForTask(task.globalIndex, userIds).map((userId) => ({
      task_id: task.id,
      user_id: userId,
    }));

    const { error } = await supabase.from("task_members").insert(rows);
    if (error && !error.message.includes("duplicate")) {
      throw new Error(`Failed to assign members for ${task.name}: ${error.message}`);
    }
  }
}

function subTaskItemsForTask(globalIndex) {
  if (globalIndex % 5 >= 2) {
    return null;
  }

  const templates = [
    ["Gather requirements", "Draft outline"],
    ["Write copy", "Get approval"],
    ["Set up environment", "Run tests"],
    ["Collect assets", "Upload to CMS"],
    ["Research options", "Prototype", "Finalize spec"],
    ["Define criteria", "Verify in staging"],
  ];

  return templates[globalIndex % templates.length];
}

async function seedSubTasks(orgId, tasks, userIds) {
  let subTaskCount = 0;

  for (const task of tasks) {
    const items = subTaskItemsForTask(task.globalIndex);
    if (!items) continue;

    let position = 0;

    for (const [subIndex, name] of items.entries()) {
      position += 100;
      const { error } = await supabase.from("sub_tasks").insert({
        org_id: orgId,
        task_id: task.id,
        name,
        is_done: subIndex < Math.ceil(items.length / 2),
        assignee_id: userIds[(task.globalIndex + subIndex) % userIds.length],
        position,
      });

      if (error) {
        throw new Error(`Failed to create sub-task for ${task.name}: ${error.message}`);
      }

      subTaskCount += 1;
    }
  }

  return subTaskCount;
}

function commentPlanForTask(task, userIds, demoUserLabels) {
  const idx = task.globalIndex;

  if (idx % 4 !== 0) {
    return null;
  }

  const author = (offset) => userIds[(idx + offset) % userIds.length];
  const label = (offset) =>
    demoUserLabels[(idx + offset) % demoUserLabels.length];

  const plans = [
    [
      { userId: author(0), body: paragraph("Kicked this off — scope looks good for this sprint.") },
      { userId: author(1), body: paragraph("Added notes from yesterday's standup. Blocking item is API access.") },
      { userId: author(2), body: mentionParagraph("Can you review the latest draft?", author(3), label(3)) },
      { userId: author(3), body: paragraph("Reviewed — one small tweak needed on the acceptance criteria.") },
    ],
    [
      { userId: author(1), body: paragraph("Client asked for an earlier preview. Feasible if we descope animations.") },
      { userId: author(2), body: paragraph("Agreed. I'll update the timeline in the project doc.") },
      { userId: author(0), body: mentionParagraph("Looping in", author(4), label(4)) },
    ],
    [
      { userId: author(2), body: paragraph("Tests are green on staging.") },
      { userId: author(0), body: paragraph("Nice — please attach the QA checklist before we close.") },
      { userId: author(1), body: paragraph("Checklist uploaded. Ready for sign-off.") },
      { userId: author(3), body: paragraph("Signed off from my side.") },
    ],
    [
      { userId: author(3), body: paragraph("Flagging a dependency on the design tokens PR.") },
      { userId: author(1), body: mentionParagraph("Merged tokens —", author(0), label(0)) },
      { userId: author(0), body: paragraph("Unblocked now, picking this back up.") },
    ],
    [
      { userId: author(4), body: paragraph("Updated estimate after spike — still within budget.") },
      { userId: author(5), body: paragraph("Thanks. Let's sync in tomorrow's planning.") },
    ],
    [
      { userId: author(0), body: paragraph("Duplicate report from support — same root cause as #142.") },
      { userId: author(2), body: paragraph("Fix deployed. Monitoring for 24h.") },
      { userId: author(1), body: paragraph("No new reports since deploy.") },
    ],
  ];

  return plans[(idx / 4) % plans.length];
}

async function seedComments(orgId, tasks, userIds, demoUserLabels) {
  let commentCount = 0;
  const commentedTasks = tasks.filter((task) => task.globalIndex % 4 === 0);

  for (const task of commentedTasks) {
    const plan = commentPlanForTask(task, userIds, demoUserLabels);
    if (!plan) continue;

    const insertedIds = [];

    for (const [commentIndex, entry] of plan.entries()) {
      const parent_id =
        commentIndex > 0 && commentIndex % 3 === 2 && insertedIds.length > 0
          ? insertedIds[insertedIds.length - 1]
          : null;

      const { data, error } = await supabase
        .from("comments")
        .insert({
          org_id: orgId,
          task_id: task.id,
          user_id: entry.userId,
          parent_id,
          body: entry.body,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`Failed to create comment on ${task.name}: ${error.message}`);
      }

      insertedIds.push(data.id);
      commentCount += 1;
    }
  }

  return commentCount;
}

async function fetchOrgTasks(orgId) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, name")
    .eq("org_id", orgId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  return (data ?? []).map((task, globalIndex) => ({ ...task, globalIndex }));
}

async function main() {
  console.log("Seeding Jiganto demo data...\n");

  const orgId = await findOrCreateOrg();
  console.log(`Organisation: ${ORG_NAME} (${orgId})`);

  const userIds = [];
  for (const user of demoUsers) {
    const userId = await findOrCreateUser(orgId, user);
    userIds.push(userId);
    console.log(`User: ${user.email}`);
  }

  const clientIds = await findOrCreateClients(orgId);
  for (const name of demoClients) {
    console.log(`Client: ${name} (${clientIds[name]})`);
  }

  const projects = await findOrCreateProjects(orgId, clientIds, userIds[0]);
  for (const project of projects) {
    console.log(`Project: ${project.name} (${project.id})`);
  }

  const demoUserLabels = demoUsers.map((user) => user.display_name.split(" ")[0]);

  if (await hasSeededTasks(orgId)) {
    if (!(await hasSeededComments(orgId))) {
      console.log("\nTasks present but comments missing — seeding comments only...");
      const tasks = await fetchOrgTasks(orgId);
      const commentCount = await seedComments(orgId, tasks, userIds, demoUserLabels);
      console.log(`  ${commentCount} comments created`);
    } else {
      console.log(
        `\nDemo task data already seeded (${SEED_TASK_THRESHOLD}+ tasks, ${SEED_COMMENT_THRESHOLD}+ comments). Skipping.`,
      );
    }
  } else {
    console.log("\nSeeding tasks, custom columns, members, sub-tasks, and comments...");
    await clearPartialTaskSeed(orgId);

    const standaloneColumns = await findOrCreateCustomColumns(orgId, null);
    const projectColumnMaps = {};

    for (const project of projects) {
      projectColumnMaps[project.id] = await findOrCreateCustomColumns(
        orgId,
        project.id,
      );
    }

    const tasks = await seedTasks(
      orgId,
      projects,
      userIds,
      standaloneColumns,
      projectColumnMaps,
    );
    console.log(`  ${tasks.length} tasks created`);

    await seedTaskMembers(tasks, userIds);
    console.log("  Task members assigned (1–3 per task)");

    const subTaskCount = await seedSubTasks(orgId, tasks, userIds);
    console.log(`  ${subTaskCount} sub-tasks created (~40% of tasks)`);

    const commentCount = await seedComments(orgId, tasks, userIds, demoUserLabels);
    console.log(`  ${commentCount} comments created on ${tasks.filter((t) => t.globalIndex % 4 === 0).length} tasks`);
  }

  console.log("\nSeed complete.");
  console.log("\nDemo login credentials:");
  console.log(`  Password for all users: ${DEMO_PASSWORD}`);
  for (const user of demoUsers) {
    console.log(`  - ${user.email}`);
  }
  console.log("\nNext: npm run dev → http://localhost:3000/login");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
