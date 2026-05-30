import { NextResponse } from "next/server";

import {
  jsonError,
  parseJsonBody,
  withApiContext,
} from "@/lib/api/http";
import { getProjectForOrg } from "@/lib/tasks/access";
import { importTasks } from "@/lib/tasks/import-tasks";
import { importTasksSchema } from "@/lib/tasks/validators";

export async function POST(request: Request) {
  return withApiContext(async ({ user, profile, supabase }) => {
    const parsed = await parseJsonBody(request, importTasksSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const input = parsed.data;
    const projectId = input.project_id ?? null;

    if (projectId) {
      const project = await getProjectForOrg(
        supabase,
        projectId,
        profile.org_id,
      );

      if (!project) {
        return jsonError("Project not found", 404);
      }
    } else if (!input.standalone) {
      return jsonError("Import requires project_id or standalone scope", 400);
    }

    const result = await importTasks(supabase, profile, {
      rows: input.rows,
      mode: input.mode,
      projectId,
      orgId: profile.org_id,
      userId: user.id,
    });

    return NextResponse.json(result);
  });
}
