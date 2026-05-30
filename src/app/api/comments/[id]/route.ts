import { NextResponse } from "next/server";

import {
  jsonError,
  parseJsonBody,
  withApiContext,
} from "@/lib/api/http";
import { updateCommentSchema } from "@/lib/tasks/validators";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  return withApiContext(async ({ user, profile, supabase }) => {
    const { id } = await context.params;

    const { data: existing } = await supabase
      .from("comments")
      .select("*")
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .maybeSingle();

    if (!existing) {
      return jsonError("Comment not found", 404);
    }

    if (existing.user_id !== user.id) {
      return jsonError("You can only edit your own comments", 403);
    }

    const parsed = await parseJsonBody(request, updateCommentSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const { data: comment, error } = await supabase
      .from("comments")
      .update({ body: parsed.data.body })
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .select("*")
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ comment });
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withApiContext(async ({ user, profile, supabase }) => {
    const { id } = await context.params;

    const { data: existing } = await supabase
      .from("comments")
      .select("*")
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .maybeSingle();

    if (!existing) {
      return jsonError("Comment not found", 404);
    }

    if (existing.user_id !== user.id) {
      return jsonError("You can only delete your own comments", 403);
    }

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", id)
      .eq("org_id", profile.org_id);

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ success: true, deleted: true });
  });
}
