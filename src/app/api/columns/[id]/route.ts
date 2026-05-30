import { NextResponse } from "next/server";

import {
  jsonError,
  parseJsonBody,
  withApiContext,
} from "@/lib/api/http";
import { updateColumnSchema } from "@/lib/tasks/validators";
import type { Json } from "@/lib/database.types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  return withApiContext(async ({ profile, supabase }) => {
    const { id } = await context.params;

    const { data: existing } = await supabase
      .from("custom_columns")
      .select("*")
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .maybeSingle();

    if (!existing) {
      return jsonError("Column not found", 404);
    }

    const parsed = await parseJsonBody(request, updateColumnSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const input = parsed.data;
    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.options !== undefined) updates.options = input.options as Json;
    if (input.config !== undefined) updates.config = input.config as Json;
    if (input.position !== undefined) updates.position = input.position;
    if (input.is_visible !== undefined) updates.is_visible = input.is_visible;

    const { data: column, error } = await supabase
      .from("custom_columns")
      .update(updates)
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .select("*")
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ column });
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withApiContext(async ({ profile, supabase }) => {
    const { id } = await context.params;

    const { data: existing } = await supabase
      .from("custom_columns")
      .select("id")
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .maybeSingle();

    if (!existing) {
      return jsonError("Column not found", 404);
    }

    const { error } = await supabase
      .from("custom_columns")
      .delete()
      .eq("id", id)
      .eq("org_id", profile.org_id);

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ success: true, deleted: true });
  });
}
