import type { User } from "@supabase/supabase-js";

import type { Profile } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export interface SessionUser {
  user: User;
  profile: Profile;
}

export async function getSessionUser(): Promise<{
  user: User | null;
  profile: Profile | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const { user, profile } = await getSessionUser();

  if (!user || !profile) {
    throw new Error("Unauthorized");
  }

  return { user, profile };
}
