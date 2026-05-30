import type { DraftTaskValues } from "@/components/tasks/table/draft-task-row";
import { getDraftDefaultsForGroup } from "@/lib/tasks/table-groups";
import type { TaskStatus } from "@/lib/database.types";

export function createEmptyDraft(
  groupKey: string,
  groupBy: string | null,
): DraftTaskValues {
  const defaults = getDraftDefaultsForGroup(groupKey, groupBy);

  return {
    name: "",
    status: (defaults.status as TaskStatus) ?? "new",
    priority: defaults.priority ?? null,
    due_date: defaults.due_date ?? null,
    start_date: defaults.start_date ?? null,
    client_id: defaults.client_id ?? null,
    member_ids: [],
    progress: 0,
  };
}
