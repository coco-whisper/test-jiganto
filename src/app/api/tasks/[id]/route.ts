import { NextResponse } from "next/server";

import {
  jsonError,
  parseJsonBody,
  withApiContext,
} from "@/lib/api/http";
import {
  attachMembersToTasks,
  getTaskForOrg,
  syncTaskMembers,
} from "@/lib/tasks/access";
import {
  getTaskProgressMeta,
  syncTaskProgressFromSubTasks,
} from "@/lib/tasks/progress";
import { resolveTaskReorderPosition } from "@/lib/tasks/position";
import { updateTaskSchema } from "@/lib/tasks/validators";
import type { Json } from "@/lib/database.types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  return withApiContext(async ({ profile, supabase }) => {
    const { id } = await context.params;
    const task = await getTaskForOrg(supabase, id, profile.org_id);

    if (!task) {
      return jsonError("Task not found", 404);
    }

    const [taskWithMembers] = await attachMembersToTasks(supabase, [task]);
    const progressMeta = await getTaskProgressMeta(
      supabase,
      task.id,
      task.progress,
      { isArchived: task.is_archived },
    );

    return NextResponse.json({
      task: {
        ...taskWithMembers,
        progress: progressMeta.progress,
        progress_source: progressMeta.source,
        progress_label: progressMeta.label,
      },
    });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withApiContext(async ({ profile, supabase }) => {
    const { id } = await context.params;
    const existing = await getTaskForOrg(supabase, id, profile.org_id);

    if (!existing) {
      return jsonError("Task not found", 404);
    }

    const parsed = await parseJsonBody(request, updateTaskSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const input = parsed.data;
    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.project_id !== undefined) updates.project_id = input.project_id;
    if (input.status !== undefined) updates.status = input.status;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.due_date !== undefined) updates.due_date = input.due_date;
    if (input.start_date !== undefined) updates.start_date = input.start_date;
    if (input.client_id !== undefined) updates.client_id = input.client_id;
    if (input.description !== undefined) updates.description = input.description;
    if (input.custom_data !== undefined) {
      updates.custom_data = input.custom_data as Json;
    }
    if (input.is_archived !== undefined) updates.is_archived = input.is_archived;

    if (input.progress !== undefined) {
      const { data: subTasks } = await supabase
        .from("sub_tasks")
        .select("id")
        .eq("task_id", id)
        .limit(1);

      if (subTasks && subTasks.length > 0) {
        return jsonError(
          "Progress is computed from sub-tasks when sub-tasks exist",
          400,
        );
      }

      updates.progress = input.progress;
    }

    if (input.position !== undefined) {
      updates.position = input.position;
    } else if (input.after_id || input.before_id) {
      try {
        updates.position = await resolveTaskReorderPosition(
          supabase,
          profile.org_id,
          {
            after_id: input.after_id,
            before_id: input.before_id,
            project_id: existing.project_id,
          },
        );
      } catch (reorderError) {
        return jsonError(
          reorderError instanceof Error
            ? reorderError.message
            : "Failed to reorder task",
          400,
        );
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .eq("org_id", profile.org_id);

      if (error) {
        return jsonError(error.message, 500);
      }
    }

    if (input.member_ids) {
      try {
        await syncTaskMembers(supabase, id, input.member_ids, profile.org_id);
      } catch (memberError) {
        return jsonError(
          memberError instanceof Error
            ? memberError.message
            : "Failed to assign members",
          400,
        );
      }
    }

    const task = await getTaskForOrg(supabase, id, profile.org_id);

    if (!task) {
      return jsonError("Task not found", 404);
    }

    if (!task.is_archived) {
      await syncTaskProgressFromSubTasks(supabase, id);
    }

    const refreshed = await getTaskForOrg(supabase, id, profile.org_id);

    if (!refreshed) {
      return jsonError("Task not found", 404);
    }

    const [taskWithMembers] = await attachMembersToTasks(supabase, [refreshed]);
    const progressMeta = await getTaskProgressMeta(
      supabase,
      refreshed.id,
      refreshed.progress,
      { isArchived: refreshed.is_archived },
    );

    return NextResponse.json({
      task: {
        ...taskWithMembers,
        progress: progressMeta.progress,
        progress_source: progressMeta.source,
        progress_label: progressMeta.label,
      },
    });
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withApiContext(async ({ profile, supabase }) => {
    const { id } = await context.params;
    const existing = await getTaskForOrg(supabase, id, profile.org_id);

    if (!existing) {
      return jsonError("Task not found", 404);
    }

    const { searchParams } = new URL(_request.url);
    const hardDelete = searchParams.get("hard") === "true";

    if (hardDelete) {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("org_id", profile.org_id);

      if (error) {
        return jsonError(error.message, 500);
      }

      return NextResponse.json({ success: true, deleted: true });
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .update({ is_archived: true })
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .select("*")
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ task, archived: true });
  });
}
