import { TaskWorkspace } from "@/components/tasks/task-workspace";
import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function TasksPage() {
  const { user, profile } = await getSessionUser();

  if (!user || !profile) {
    redirect("/login");
  }

  return (
    <TaskWorkspace
      orgId={profile.org_id}
      title="All Tasks"
      description="Standalone tasks not linked to a project — visible to your team."
      currentUserId={user.id}
    />
  );
}
