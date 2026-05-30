import { notFound, redirect } from "next/navigation";

import { ProjectHeader } from "@/components/projects/project-header";
import { TaskWorkspace } from "@/components/tasks/task-workspace";
import { getSessionUser } from "@/lib/auth/session";
import { getProjectMemberProfiles } from "@/lib/projects/members";
import { createClient } from "@/lib/supabase/server";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const { user, profile } = await getSessionUser();

  if (!user || !profile) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("org_id", profile.org_id)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  let clientName: string | null = null;
  if (project.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", project.client_id)
      .eq("org_id", profile.org_id)
      .maybeSingle();
    clientName = client?.name ?? null;
  }

  const members = await getProjectMemberProfiles(
    supabase,
    projectId,
    profile.org_id,
  );

  return (
    <>
      <ProjectHeader
        name={project.name}
        status={project.status}
        clientName={clientName}
        startDate={project.start_date}
        dueDate={project.due_date}
        members={members}
      />
      <TaskWorkspace
        orgId={profile.org_id}
        title={project.name}
        projectId={projectId}
        hidePageHeader
        emptyHint="Press Add task to create the first task in this project."
        currentUserId={user.id}
      />
    </>
  );
}
