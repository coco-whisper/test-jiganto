import { NextResponse } from "next/server";

import { jsonError, parseJsonBody, withApiContext } from "@/lib/api/http";
import { z } from "zod";

const createNotificationSchema = z.object({
  user_id: z.string().uuid(),
  task_id: z.string().uuid().optional(),
  comment_id: z.string().uuid().optional(),
  type: z.string().min(1),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  return withApiContext(async ({ profile, supabase }) => {
    const parsed = await parseJsonBody(request, createNotificationSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const input = parsed.data;

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", input.user_id)
      .eq("org_id", profile.org_id)
      .maybeSingle();

    if (!targetProfile) {
      return jsonError("User not found in organisation", 404);
    }

    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        org_id: profile.org_id,
        user_id: input.user_id,
        task_id: input.task_id ?? null,
        comment_id: input.comment_id ?? null,
        type: input.type,
        message: input.message,
      })
      .select("*")
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ notification }, { status: 201 });
  });
}
