import { NextResponse } from "next/server";

import {
  jsonError,
  parseJsonBody,
  withApiContext,
} from "@/lib/api/http";
import { syncTaskProgressFromSubTasks } from "@/lib/tasks/progress";
import { updateSubTaskSchema } from "@/lib/tasks/validators";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  return withApiContext(async ({ profile, supabase }) => {
    const { id } = await context.params;

    const { data: existing } = await supabase
      .from("sub_tasks")
      .select("*")
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .maybeSingle();

    if (!existing) {
      return jsonError("Sub-task not found", 404);
    }

    const parsed = await parseJsonBody(request, updateSubTaskSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const input = parsed.data;

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

    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.assignee_id !== undefined) updates.assignee_id = input.assignee_id;
    if (input.is_done !== undefined) updates.is_done = input.is_done;
    if (input.position !== undefined) updates.position = input.position;

    const { data: subTask, error } = await supabase
      .from("sub_tasks")
      .update(updates)
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .select("*")
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    const progress = await syncTaskProgressFromSubTasks(
      supabase,
      existing.task_id,
    );

    return NextResponse.json({ sub_task: subTask, task_progress: progress });
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withApiContext(async ({ profile, supabase }) => {
    const { id } = await context.params;

    const { data: existing } = await supabase
      .from("sub_tasks")
      .select("task_id")
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .maybeSingle();

    if (!existing) {
      return jsonError("Sub-task not found", 404);
    }

    const { error } = await supabase
      .from("sub_tasks")
      .delete()
      .eq("id", id)
      .eq("org_id", profile.org_id);

    if (error) {
      return jsonError(error.message, 500);
    }

    const progress = await syncTaskProgressFromSubTasks(
      supabase,
      existing.task_id,
    );

    return NextResponse.json({ success: true, task_progress: progress });
  });
}
