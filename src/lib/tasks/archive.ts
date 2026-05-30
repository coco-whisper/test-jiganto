import { subDays } from "date-fns";

import type { ApiSupabase } from "@/lib/api/http";
import { ARCHIVE_COMPLETED_AFTER_DAYS } from "@/lib/tasks/constants";

export async function autoArchiveCompletedTasks(
  supabase: ApiSupabase,
  orgId: string,
): Promise<number> {
  const cutoff = subDays(new Date(), ARCHIVE_COMPLETED_AFTER_DAYS).toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .update({ is_archived: true })
    .eq("org_id", orgId)
    .eq("status", "completed")
    .eq("is_archived", false)
    .lt("updated_at", cutoff)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}
