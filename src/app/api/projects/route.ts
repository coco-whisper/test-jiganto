import { NextResponse } from "next/server";

import {
  jsonError,
  parseJsonBody,
  withApiContext,
} from "@/lib/api/http";
import { createProjectSchema } from "@/lib/tasks/validators";

export async function GET(request: Request) {
  return withApiContext(async ({ profile, supabase }) => {
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("include_archived") === "true";

    let query = supabase
      .from("projects")
      .select("*")
      .eq("org_id", profile.org_id)
      .order("name", { ascending: true });

    if (!includeArchived) {
      query = query.eq("is_archived", false);
    }

    const { data: projects, error } = await query;

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ projects: projects ?? [] });
  });
}

export async function POST(request: Request) {
  return withApiContext(async ({ user, profile, supabase }) => {
    const parsed = await parseJsonBody(request, createProjectSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const input = parsed.data;

    if (input.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("id", input.client_id)
        .eq("org_id", profile.org_id)
        .maybeSingle();

      if (!client) {
        return jsonError("Client not found", 404);
      }
    }

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        org_id: profile.org_id,
        name: input.name,
        status: input.status ?? "new",
        client_id: input.client_id ?? null,
        start_date: input.start_date ?? null,
        due_date: input.due_date ?? null,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ project }, { status: 201 });
  });
}
