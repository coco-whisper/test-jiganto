import { NextResponse } from "next/server";

import {
  jsonError,
  parseJsonBody,
  withApiContext,
} from "@/lib/api/http";
import { getTaskForOrg } from "@/lib/tasks/access";
import { syncTaskProgressFromSubTasks } from "@/lib/tasks/progress";
import { getNextSubTaskPosition } from "@/lib/tasks/position";
import { createSubTaskSchema } from "@/lib/tasks/validators";

export async function GET(request: Request) {
  return withApiContext(async ({ profile, supabase }) => {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task_id");

    if (!taskId) {
      return jsonError("task_id query parameter is required", 400);
    }

    const task = await getTaskForOrg(supabase, taskId, profile.org_id);

    if (!task) {
      return jsonError("Task not found", 404);
    }

    const { data: subTasks, error } = await supabase
      .from("sub_tasks")
      .select("*")
      .eq("task_id", taskId)
      .eq("org_id", profile.org_id)
      .order("position", { ascending: true });

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ sub_tasks: subTasks ?? [] });
  });
}

export async function POST(request: Request) {
  return withApiContext(async ({ profile, supabase }) => {
    const parsed = await parseJsonBody(request, createSubTaskSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const input = parsed.data;
    const task = await getTaskForOrg(supabase, input.task_id, profile.org_id);

    if (!task) {
      return jsonError("Task not found", 404);
    }

    if (input.assignee_id) {
      const { data: assignee } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", input.assignee_id)
        .eq("org_id", profile.org_id)
        .maybeSingle();

      if (!assignee) {
        return jsonError("Assignee not found in organisation", 404);
      }
    }

    const position =
      input.position ?? (await getNextSubTaskPosition(supabase, input.task_id));

    const { data: subTask, error } = await supabase
      .from("sub_tasks")
      .insert({
        task_id: input.task_id,
        org_id: profile.org_id,
        name: input.name,
        assignee_id: input.assignee_id ?? null,
        is_done: input.is_done ?? false,
        position,
      })
      .select("*")
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    const progress = await syncTaskProgressFromSubTasks(supabase, input.task_id);

    return NextResponse.json({ sub_task: subTask, task_progress: progress }, { status: 201 });
  });
}
