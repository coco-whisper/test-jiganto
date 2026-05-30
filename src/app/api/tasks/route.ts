import { NextResponse } from "next/server";

import {
  jsonError,
  parseJsonBody,
  withApiContext,
} from "@/lib/api/http";
import { autoArchiveCompletedTasks } from "@/lib/tasks/archive";
import {
  attachMembersToTasks,
  filterMyTasks,
  getProjectForOrg,
  syncTaskMembers,
} from "@/lib/tasks/access";
import { getTaskProgressMeta } from "@/lib/tasks/progress";
import { getNextTaskPosition } from "@/lib/tasks/position";
import { createTaskSchema } from "@/lib/tasks/validators";
import type { Json } from "@/lib/database.types";

export async function GET(request: Request) {
  return withApiContext(async ({ profile, supabase }) => {
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get("project_id");
    const mine = searchParams.get("mine") === "true";
    const standalone = searchParams.get("standalone") === "true";
    const includeArchived = searchParams.get("include_archived") === "true";

    await autoArchiveCompletedTasks(supabase, profile.org_id);

    let query = supabase
      .from("tasks")
      .select("*")
      .eq("org_id", profile.org_id)
      .order("position", { ascending: true });

    if (!includeArchived) {
      query = query.eq("is_archived", false);
    }

    if (projectId) {
      query = query.eq("project_id", projectId);
    } else if (standalone) {
      query = query.is("project_id", null);
    }

    const { data: tasks, error } = await query;

    if (error) {
      return jsonError(error.message, 500);
    }

    let result = tasks ?? [];

    if (mine) {
      const { data: memberRows } = await supabase
        .from("task_members")
        .select("task_id")
        .eq("user_id", profile.id);

      const memberTaskIds = memberRows?.map((row) => row.task_id) ?? [];
      result = filterMyTasks(result, profile, memberTaskIds);
    }

    const tasksWithMembers = await attachMembersToTasks(supabase, result);

    const tasksWithProgress = await Promise.all(
      tasksWithMembers.map(async (task) => {
        const progressMeta = await getTaskProgressMeta(
          supabase,
          task.id,
          task.progress,
          { isArchived: task.is_archived },
        );

        return {
          ...task,
          progress: progressMeta.progress,
          progress_source: progressMeta.source,
          progress_label: progressMeta.label,
        };
      }),
    );

    return NextResponse.json({ tasks: tasksWithProgress });
  });
}

export async function POST(request: Request) {
  return withApiContext(async ({ user, profile, supabase }) => {
    const parsed = await parseJsonBody(request, createTaskSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const input = parsed.data;

    if (input.project_id) {
      const project = await getProjectForOrg(
        supabase,
        input.project_id,
        profile.org_id,
      );

      if (!project) {
        return jsonError("Project not found", 404);
      }
    }

    const position =
      input.position ??
      (await getNextTaskPosition(
        supabase,
        profile.org_id,
        input.project_id ?? null,
      ));

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        org_id: profile.org_id,
        name: input.name,
        project_id: input.project_id ?? null,
        status: input.status ?? "new",
        priority: input.priority ?? null,
        due_date: input.due_date ?? null,
        start_date: input.start_date ?? null,
        client_id: input.client_id ?? null,
        description: input.description ?? null,
        progress: input.progress ?? 0,
        custom_data: (input.custom_data ?? {}) as Json,
        created_by: user.id,
        position,
      })
      .select("*")
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    if (input.member_ids) {
      try {
        await syncTaskMembers(supabase, task.id, input.member_ids, profile.org_id);
      } catch (memberError) {
        return jsonError(
          memberError instanceof Error
            ? memberError.message
            : "Failed to assign members",
          400,
        );
      }
    }

    const [taskWithMembers] = await attachMembersToTasks(supabase, [task]);
    const progressMeta = await getTaskProgressMeta(
      supabase,
      task.id,
      task.progress,
      { isArchived: task.is_archived },
    );

    return NextResponse.json(
      {
        task: {
          ...taskWithMembers,
          progress: progressMeta.progress,
          progress_source: progressMeta.source,
          progress_label: progressMeta.label,
        },
      },
      { status: 201 },
    );
  });
}
