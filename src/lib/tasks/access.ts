import type { ApiSupabase } from "@/lib/api/http";
import type { Profile, Task } from "@/lib/database.types";

export async function getTaskForOrg(
  supabase: ApiSupabase,
  taskId: string,
  orgId: string,
): Promise<Task | null> {
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("org_id", orgId)
    .maybeSingle();

  return data;
}

export async function getProjectForOrg(
  supabase: ApiSupabase,
  projectId: string,
  orgId: string,
) {
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("org_id", orgId)
    .maybeSingle();

  return data;
}

export async function syncTaskMembers(
  supabase: ApiSupabase,
  taskId: string,
  memberIds: string[],
  orgId: string,
): Promise<void> {
  if (memberIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("org_id", orgId)
      .in("id", memberIds);

    const validIds = new Set(profiles?.map((profile) => profile.id) ?? []);
    const invalid = memberIds.filter((id) => !validIds.has(id));

    if (invalid.length > 0) {
      throw new Error("One or more members are not in your organisation");
    }
  }

  await supabase.from("task_members").delete().eq("task_id", taskId);

  if (memberIds.length > 0) {
    const { error } = await supabase.from("task_members").insert(
      memberIds.map((userId) => ({
        task_id: taskId,
        user_id: userId,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function attachMembersToTasks<T extends { id: string }>(
  supabase: ApiSupabase,
  tasks: T[],
): Promise<Array<T & { member_ids: string[] }>> {
  if (tasks.length === 0) {
    return [];
  }

  const taskIds = tasks.map((task) => task.id);
  const { data: members } = await supabase
    .from("task_members")
    .select("task_id, user_id")
    .in("task_id", taskIds);

  const membersByTask = new Map<string, string[]>();

  for (const member of members ?? []) {
    const existing = membersByTask.get(member.task_id) ?? [];
    existing.push(member.user_id);
    membersByTask.set(member.task_id, existing);
  }

  return tasks.map((task) => ({
    ...task,
    member_ids: membersByTask.get(task.id) ?? [],
  }));
}

export function filterMyTasks<T extends { id: string; created_by: string | null }>(
  tasks: T[],
  profile: Profile,
  memberTaskIds: string[],
): T[] {
  const memberSet = new Set(memberTaskIds);

  return tasks.filter(
    (task) => task.created_by === profile.id || memberSet.has(task.id),
  );
}
