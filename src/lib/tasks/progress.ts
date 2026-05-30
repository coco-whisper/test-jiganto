import type { ApiSupabase } from "@/lib/api/http";

export function calculateProgressFromSubTasks(
  subTasks: Array<{ is_done: boolean }>,
): number {
  if (subTasks.length === 0) {
    return 0;
  }

  const completed = subTasks.filter((subTask) => subTask.is_done).length;
  return Math.round((completed / subTasks.length) * 100);
}

export function formatProgressLabel(
  completed: number,
  total: number,
  percent: number,
): string {
  return `${completed}/${total} (${percent}%)`;
}

export async function syncTaskProgressFromSubTasks(
  supabase: ApiSupabase,
  taskId: string,
): Promise<number | null> {
  const { data: subTasks, error } = await supabase
    .from("sub_tasks")
    .select("is_done")
    .eq("task_id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  if (!subTasks || subTasks.length === 0) {
    return null;
  }

  const progress = calculateProgressFromSubTasks(subTasks);

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ progress })
    .eq("id", taskId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return progress;
}

export async function getTaskProgressMeta(
  supabase: ApiSupabase,
  taskId: string,
  manualProgress: number,
  options?: { isArchived?: boolean },
): Promise<{
  progress: number;
  source: "sub_tasks" | "manual";
  label: string;
}> {
  if (options?.isArchived) {
    return {
      progress: manualProgress,
      source: "manual",
      label: `${manualProgress}%`,
    };
  }

  const { data: subTasks } = await supabase
    .from("sub_tasks")
    .select("is_done")
    .eq("task_id", taskId);

  if (subTasks && subTasks.length > 0) {
    const completed = subTasks.filter((subTask) => subTask.is_done).length;
    const progress = calculateProgressFromSubTasks(subTasks);

    return {
      progress,
      source: "sub_tasks",
      label: formatProgressLabel(completed, subTasks.length, progress),
    };
  }

  return {
    progress: manualProgress,
    source: "manual",
    label: `${manualProgress}%`,
  };
}
