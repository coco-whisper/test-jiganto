import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { requireSessionUser, type SessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ApiSupabase = SupabaseClient<Database>;

export interface ApiContext extends SessionUser {
  supabase: ApiSupabase;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonValidationError(error: ZodError) {
  return jsonError(error.issues[0]?.message ?? "Invalid request", 400);
}

export async function withApiContext(
  handler: (ctx: ApiContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  let session: SessionUser;

  try {
    session = await requireSessionUser();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  try {
    const supabase = await createClient();
    return await handler({ ...session, supabase });
  } catch (error) {
    console.error("API handler error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return jsonError(message, 500);
  }
}

export async function parseJsonBody<T>(
  request: Request,
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: ZodError } },
): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { error: jsonError("Invalid JSON body", 400) };
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return { error: jsonValidationError(parsed.error) };
  }

  return { data: parsed.data };
}
