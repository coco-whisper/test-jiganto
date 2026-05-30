#!/usr/bin/env node

/**
 * Seeds demo org, users, client, and project for Jiganto Task Tracker Phase 0.
 *
 * Prerequisites:
 * 1. Run supabase/migrations/*.sql in your Supabase project (SQL editor or CLI)
 * 2. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Usage: npm run db:seed
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
const PROJECT_NAME = "Website Redesign";

const demoUsers = [
  { email: "alex@demo.jiganto.app", display_name: "Alex Chen" },
  { email: "sam@demo.jiganto.app", display_name: "Sam Rivera" },
  { email: "jordan@demo.jiganto.app", display_name: "Jordan Lee" },
];

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

async function findOrCreateClient(orgId) {
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", "Acme Corp")
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ org_id: orgId, name: "Acme Corp" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create client: ${error.message}`);
  }

  return data.id;
}

async function findOrCreateProject(orgId, clientId, createdBy) {
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", PROJECT_NAME)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      org_id: orgId,
      name: PROJECT_NAME,
      status: "in_progress",
      client_id: clientId,
      start_date: "2026-03-01",
      due_date: "2026-06-30",
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return data.id;
}

async function hasSeededTasks(orgId) {
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  if (error) {
    throw new Error(`Failed to count tasks: ${error.message}`);
  }

  return (count ?? 0) >= 20;
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

async function seedTasks(orgId, projectId, clientId, userIds, standaloneColumns, projectColumns) {
  const standaloneTasks = [
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
  ];

  const projectTasks = [
    { name: "Homepage hero redesign", status: "in_progress", priority: "high", start_date: "2026-03-10", due_date: "2026-05-30", custom: { "Estimate (hrs)": 24, Phase: "Build" } },
    { name: "Client sign-off on wireframes", status: "pending", priority: "high", due_date: "2026-06-05", custom: { "Estimate (hrs)": 8, Phase: "Discovery" } },
    { name: "Implement responsive nav", status: "in_progress", priority: "medium", start_date: "2026-05-01", due_date: "2026-06-15", custom: { "Estimate (hrs)": 16, Phase: "Build" } },
    { name: "Performance audit", status: "new", priority: "medium", due_date: "2026-06-22", custom: { "Estimate (hrs)": 12, Phase: "Launch" } },
    { name: "Content migration", status: "delayed", priority: "high", due_date: "2026-05-25", custom: { "Estimate (hrs)": 20, Phase: "Build" } },
    { name: "SEO metadata pass", status: "completed", priority: "medium", due_date: "2026-05-15", custom: { "Estimate (hrs)": 6, Phase: "Launch" } },
    { name: "Accessibility review", status: "pending", priority: "high", due_date: "2026-06-18", custom: { "Estimate (hrs)": 10, Phase: "Launch" } },
    { name: "Launch checklist", status: "new", priority: "medium", due_date: "2026-06-28", custom: { "Estimate (hrs)": 4, Phase: "Launch" } },
  ];

  const batches = [
    { tasks: standaloneTasks, project_id: null, columnMap: standaloneColumns },
    { tasks: projectTasks, project_id: projectId, columnMap: projectColumns },
  ];

  const createdTasks = [];

  for (const batch of batches) {
    let position = 0;

    for (const [index, task] of batch.tasks.entries()) {
      position += 1000;

      const custom_data = {};
      for (const [label, value] of Object.entries(task.custom ?? {})) {
        const columnId = batch.columnMap[label];
        if (columnId) custom_data[columnId] = value;
      }

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
          client_id: batch.project_id ? clientId : null,
          progress: task.status === "completed" ? 100 : index % 4 === 0 ? 40 : 0,
          custom_data,
          created_by: userIds[index % userIds.length],
          position,
        })
        .select("id, name")
        .single();

      if (error) {
        throw new Error(`Failed to create task "${task.name}": ${error.message}`);
      }

      createdTasks.push(data);
    }
  }

  return createdTasks;
}

async function seedTaskMembers(tasks, userIds) {
  for (const [index, task] of tasks.entries()) {
    const assignee = userIds[index % userIds.length];
    const reviewer = userIds[(index + 1) % userIds.length];
    const memberIds =
      assignee === reviewer ? [assignee] : [assignee, reviewer];

    const rows = memberIds.map((userId) => ({
      task_id: task.id,
      user_id: userId,
    }));

    const { error } = await supabase.from("task_members").insert(rows);
    if (error && !error.message.includes("duplicate")) {
      throw new Error(`Failed to assign members for ${task.name}: ${error.message}`);
    }
  }
}

async function seedSubTasks(orgId, tasks, userIds) {
  const subTaskTemplates = [
    ["Gather requirements", "Draft outline", "Review with team"],
    ["Write copy", "Get approval"],
    ["Set up environment", "Run tests", "Deploy preview", "Verify analytics"],
    ["Collect assets", "Upload to CMS"],
    ["Checklist sign-off"],
  ];

  for (const [index, task] of tasks.entries()) {
    if (index % 4 !== 0) continue;

    const items = subTaskTemplates[index % subTaskTemplates.length];
    let position = 0;

    for (const [subIndex, name] of items.entries()) {
      position += 100;
      const { error } = await supabase.from("sub_tasks").insert({
        org_id: orgId,
        task_id: task.id,
        name,
        is_done: subIndex < Math.floor(items.length / 2),
        assignee_id: userIds[subIndex % userIds.length],
        position,
      });

      if (error) {
        throw new Error(`Failed to create sub-task for ${task.name}: ${error.message}`);
      }
    }
  }
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

  const clientId = await findOrCreateClient(orgId);
  console.log(`Client: Acme Corp (${clientId})`);

  const projectId = await findOrCreateProject(orgId, clientId, userIds[0]);
  console.log(`Project: ${PROJECT_NAME} (${projectId})`);

  if (await hasSeededTasks(orgId)) {
    console.log("\nTasks already seeded (20+ tasks found). Skipping task data.");
  } else {
    console.log("\nSeeding tasks, custom columns, and sub-tasks...");

    const standaloneColumns = await findOrCreateCustomColumns(orgId, null);
    const projectColumns = await findOrCreateCustomColumns(orgId, projectId);

    const tasks = await seedTasks(
      orgId,
      projectId,
      clientId,
      userIds,
      standaloneColumns,
      projectColumns,
    );
    console.log(`  ${tasks.length} tasks created`);

    await seedTaskMembers(tasks, userIds);
    console.log("  Task members assigned");

    await seedSubTasks(orgId, tasks, userIds);
    console.log("  Sub-tasks created on selected tasks");
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
