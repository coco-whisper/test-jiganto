import { NextResponse } from "next/server";

import {
  jsonError,
  parseJsonBody,
  withApiContext,
} from "@/lib/api/http";
import { getProjectForOrg } from "@/lib/tasks/access";
import { updateViewPreferencesSchema } from "@/lib/tasks/validators";
import type { Json } from "@/lib/database.types";

function normalizeProjectId(value: string | null): string | null {
  if (!value || value === "null") {
    return null;
  }

  return value;
}

export async function GET(request: Request) {
  return withApiContext(async ({ profile, supabase }) => {
    const { searchParams } = new URL(request.url);
    const projectId = normalizeProjectId(searchParams.get("project_id"));

    if (projectId) {
      const project = await getProjectForOrg(supabase, projectId, profile.org_id);

      if (!project) {
        return jsonError("Project not found", 404);
      }
    }

    let query = supabase
      .from("view_preferences")
      .select("*")
      .eq("user_id", profile.id);

    if (projectId) {
      query = query.eq("project_id", projectId);
    } else {
      query = query.is("project_id", null);
    }

    const { data: preferences, error } = await query.maybeSingle();

    if (error) {
      return jsonError(error.message, 500);
    }

    if (!preferences) {
      return NextResponse.json({
        preferences: {
          user_id: profile.id,
          project_id: projectId,
          view_mode: "table",
          group_by: "status",
          sort_config: [],
          hidden_columns: ["priority"],
          filters: [],
          kanban_config: {},
          calendar_config: {},
          timeline_config: {},
        },
      });
    }

    return NextResponse.json({ preferences });
  });
}

export async function PATCH(request: Request) {
  return withApiContext(async ({ profile, supabase }) => {
    const parsed = await parseJsonBody(request, updateViewPreferencesSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const input = parsed.data;
    const projectId =
      input.project_id !== undefined
        ? input.project_id
        : normalizeProjectId(
            new URL(request.url).searchParams.get("project_id"),
          );

    if (projectId) {
      const project = await getProjectForOrg(supabase, projectId, profile.org_id);

      if (!project) {
        return jsonError("Project not found", 404);
      }
    }

    let existingQuery = supabase
      .from("view_preferences")
      .select("id")
      .eq("user_id", profile.id);

    if (projectId) {
      existingQuery = existingQuery.eq("project_id", projectId);
    } else {
      existingQuery = existingQuery.is("project_id", null);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    const payload = {
      user_id: profile.id,
      project_id: projectId,
      ...(input.view_mode !== undefined && { view_mode: input.view_mode }),
      ...(input.group_by !== undefined && { group_by: input.group_by }),
      ...(input.sort_config !== undefined && {
        sort_config: input.sort_config as Json,
      }),
      ...(input.hidden_columns !== undefined && {
        hidden_columns: input.hidden_columns as Json,
      }),
      ...(input.filters !== undefined && { filters: input.filters as Json }),
      ...(input.kanban_config !== undefined && {
        kanban_config: input.kanban_config as Json,
      }),
      ...(input.calendar_config !== undefined && {
        calendar_config: input.calendar_config as Json,
      }),
      ...(input.timeline_config !== undefined && {
        timeline_config: input.timeline_config as Json,
      }),
    };

    if (existing) {
      const { data: preferences, error } = await supabase
        .from("view_preferences")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) {
        return jsonError(error.message, 500);
      }

      return NextResponse.json({ preferences });
    }

    const { data: preferences, error } = await supabase
      .from("view_preferences")
      .insert({
        user_id: profile.id,
        project_id: projectId,
        view_mode: input.view_mode ?? "table",
        group_by: input.group_by ?? "status",
        sort_config: (input.sort_config ?? []) as Json,
        hidden_columns: (input.hidden_columns ?? []) as Json,
        filters: (input.filters ?? []) as Json,
        kanban_config: (input.kanban_config ?? {}) as Json,
        calendar_config: (input.calendar_config ?? {}) as Json,
        timeline_config: (input.timeline_config ?? {}) as Json,
      })
      .select("*")
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ preferences }, { status: 201 });
  });
}
