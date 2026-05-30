import { TaskWorkspace } from "@/components/tasks/task-workspace";
import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function MyTasksPage() {
  const { user, profile } = await getSessionUser();

  if (!user || !profile) {
    redirect("/login");
  }

  return (
    <TaskWorkspace
      orgId={profile.org_id}
      title="My Tasks"
      description="Standalone tasks you created or are assigned to."
      mine
      emptyHint="Tasks assigned to you or created by you will appear here."
      currentUserId={user.id}
    />
  );
}
