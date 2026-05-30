import { NextResponse } from "next/server";

import { jsonError, withApiContext } from "@/lib/api/http";

export async function GET() {
  return withApiContext(async ({ profile, supabase }) => {
    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, name, logo_url")
      .eq("org_id", profile.org_id)
      .order("name", { ascending: true });

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ clients: clients ?? [] });
  });
}
