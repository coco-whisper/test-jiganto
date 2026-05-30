import type { ApiSupabase } from "@/lib/api/http";

export type ProjectMemberProfile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

export async function getProjectMemberProfiles(
  supabase: ApiSupabase,
  projectId: string,
  orgId: string,
): Promise<ProjectMemberProfile[]> {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, created_by")
    .eq("project_id", projectId)
    .eq("org_id", orgId);

  if (!tasks?.length) {
    return [];
  }

  const taskIds = tasks.map((task) => task.id);
  const userIds = new Set<string>();

  for (const task of tasks) {
    if (task.created_by) {
      userIds.add(task.created_by);
    }
  }

  const { data: memberRows } = await supabase
    .from("task_members")
    .select("user_id")
    .in("task_id", taskIds);

  for (const row of memberRows ?? []) {
    userIds.add(row.user_id);
  }

  if (userIds.size === 0) {
    return [];
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url")
    .in("id", Array.from(userIds))
    .eq("org_id", orgId)
    .order("display_name", { ascending: true });

  return profiles ?? [];
}

export function memberDisplayName(member: ProjectMemberProfile): string {
  return (
    member.display_name ??
    member.email.split("@")[0] ??
    member.email
  );
}

export function memberInitials(member: ProjectMemberProfile): string {
  const name = memberDisplayName(member);
  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}
