import { NextResponse } from "next/server";

import { jsonError, withApiContext } from "@/lib/api/http";

export async function GET() {
  return withApiContext(async ({ profile, supabase }) => {
    const { data: members, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, avatar_url")
      .eq("org_id", profile.org_id)
      .order("display_name", { ascending: true });

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ members: members ?? [] });
  });
}
