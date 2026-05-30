import type { ApiSupabase } from "@/lib/api/http";

export async function getNextTaskPosition(
  supabase: ApiSupabase,
  orgId: string,
  projectId?: string | null,
): Promise<number> {
  let query = supabase
    .from("tasks")
    .select("position")
    .eq("org_id", orgId)
    .order("position", { ascending: false })
    .limit(1);

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else if (projectId === null) {
    query = query.is("project_id", null);
  }

  const { data } = await query.maybeSingle();
  return (data?.position ?? 0) + 1;
}

export async function getNextSubTaskPosition(
  supabase: ApiSupabase,
  taskId: string,
): Promise<number> {
  const { data } = await supabase
    .from("sub_tasks")
    .select("position")
    .eq("task_id", taskId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.position ?? 0) + 1;
}

export function midpointPosition(before: number, after: number): number {
  return (before + after) / 2;
}

export async function resolveTaskReorderPosition(
  supabase: ApiSupabase,
  orgId: string,
  options: {
    after_id?: string;
    before_id?: string;
    project_id?: string | null;
  },
): Promise<number> {
  if (options.after_id) {
    const { data: afterTask } = await supabase
      .from("tasks")
      .select("position, project_id")
      .eq("id", options.after_id)
      .eq("org_id", orgId)
      .single();

    if (!afterTask) {
      throw new Error("Reference task not found");
    }

    let nextQuery = supabase
      .from("tasks")
      .select("position")
      .eq("org_id", orgId)
      .gt("position", afterTask.position)
      .order("position", { ascending: true })
      .limit(1);

    if (afterTask.project_id) {
      nextQuery = nextQuery.eq("project_id", afterTask.project_id);
    } else {
      nextQuery = nextQuery.is("project_id", null);
    }

    const { data: nextTask } = await nextQuery.maybeSingle();

    if (nextTask) {
      return midpointPosition(afterTask.position, nextTask.position);
    }

    return afterTask.position + 1;
  }

  if (options.before_id) {
    const { data: beforeTask } = await supabase
      .from("tasks")
      .select("position, project_id")
      .eq("id", options.before_id)
      .eq("org_id", orgId)
      .single();

    if (!beforeTask) {
      throw new Error("Reference task not found");
    }

    let prevQuery = supabase
      .from("tasks")
      .select("position")
      .eq("org_id", orgId)
      .lt("position", beforeTask.position)
      .order("position", { ascending: false })
      .limit(1);

    if (beforeTask.project_id) {
      prevQuery = prevQuery.eq("project_id", beforeTask.project_id);
    } else {
      prevQuery = prevQuery.is("project_id", null);
    }

    const { data: prevTask } = await prevQuery.maybeSingle();

    if (prevTask) {
      return midpointPosition(prevTask.position, beforeTask.position);
    }

    return beforeTask.position / 2;
  }

  return getNextTaskPosition(supabase, orgId, options.project_id);
}
