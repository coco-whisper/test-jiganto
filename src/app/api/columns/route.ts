import { NextResponse } from "next/server";

import {
  jsonError,
  parseJsonBody,
  withApiContext,
} from "@/lib/api/http";
import type { ApiSupabase } from "@/lib/api/http";
import { MAX_CUSTOM_COLUMNS } from "@/lib/tasks/constants";
import { getProjectForOrg } from "@/lib/tasks/access";
import { createColumnSchema } from "@/lib/tasks/validators";
import type { Json } from "@/lib/database.types";

async function countColumnsForScope(
  supabase: ApiSupabase,
  orgId: string,
  projectId: string | null,
) {
  let query = supabase
    .from("custom_columns")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function GET(request: Request) {
  return withApiContext(async ({ profile, supabase }) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    let query = supabase
      .from("custom_columns")
      .select("*")
      .eq("org_id", profile.org_id)
      .order("position", { ascending: true });

    if (projectId === "null" || searchParams.get("standalone") === "true") {
      query = query.is("project_id", null);
    } else if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data: columns, error } = await query;

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ columns: columns ?? [] });
  });
}

export async function POST(request: Request) {
  return withApiContext(async ({ profile, supabase }) => {
    const parsed = await parseJsonBody(request, createColumnSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const input = parsed.data;
    const projectId = input.project_id ?? null;

    if (projectId) {
      const project = await getProjectForOrg(supabase, projectId, profile.org_id);

      if (!project) {
        return jsonError("Project not found", 404);
      }
    }

    try {
      const columnCount = await countColumnsForScope(
        supabase,
        profile.org_id,
        projectId,
      );

      if (columnCount >= MAX_CUSTOM_COLUMNS) {
        return jsonError(
          `Maximum of ${MAX_CUSTOM_COLUMNS} custom columns allowed per list`,
          400,
        );
      }
    } catch (countError) {
      return jsonError(
        countError instanceof Error ? countError.message : "Failed to count columns",
        500,
      );
    }

    let position = input.position;

    if (position === undefined) {
      let positionQuery = supabase
        .from("custom_columns")
        .select("position")
        .eq("org_id", profile.org_id)
        .order("position", { ascending: false })
        .limit(1);

      if (projectId) {
        positionQuery = positionQuery.eq("project_id", projectId);
      } else {
        positionQuery = positionQuery.is("project_id", null);
      }

      const { data: lastColumn } = await positionQuery.maybeSingle();
      position = (lastColumn?.position ?? -1) + 1;
    }

    const { data: column, error } = await supabase
      .from("custom_columns")
      .insert({
        org_id: profile.org_id,
        project_id: projectId,
        name: input.name,
        field_type: input.field_type,
        options: (input.options ?? []) as Json,
        config: (input.config ?? {}) as Json,
        position,
        is_visible: input.is_visible ?? true,
      })
      .select("*")
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ column }, { status: 201 });
  });
}
