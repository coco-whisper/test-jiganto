import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import {
  formatStatusLabel,
  getTaskFieldValue,
  groupTasksByColumn,
} from "@/lib/tasks/client-filter";
import { sortTasksArchivedLast } from "@/lib/tasks/csv";
import { TASK_STATUSES } from "@/lib/tasks/constants";
import type { TaskStatus } from "@/lib/database.types";

export interface TableGroup {
  key: string;
  label: string;
  tasks: TaskWithMeta[];
}

export function buildTableGroups(
  tasks: TaskWithMeta[],
  groupBy: string | null,
): TableGroup[] {
  if (groupBy === "status") {
    const grouped = groupTasksByColumn(tasks, "status");
    const byKey = new Map(grouped.map((group) => [group.key, group.tasks]));

    return TASK_STATUSES.map((status) => ({
      key: status,
      label: formatStatusLabel(status),
      tasks: sortTasksArchivedLast(byKey.get(status) ?? []),
    }));
  }

  const groups = groupTasksByColumn(tasks, groupBy);

  if (groups.length === 0 && groupBy) {
    return [{ key: "none", label: "Unassigned", tasks: [] }];
  }

  if (groups.length === 0) {
    return [{ key: "all", label: "All tasks", tasks: [] }];
  }

  return groups.map((group) => ({
    ...group,
    tasks: sortTasksArchivedLast(group.tasks),
  }));
}

export function getDefaultDraftGroupKey(
  groups: TableGroup[],
  groupBy: string | null,
): string {
  if (groups.length > 0) {
    return groups[0].key;
  }

  if (groupBy === "status") {
    return "new";
  }

  return "all";
}

export function getDraftDefaultsForGroup(
  groupKey: string,
  groupBy: string | null,
): Partial<TaskWithMeta> {
  if (groupBy === "status" && TASK_STATUSES.includes(groupKey as TaskStatus)) {
    return { status: groupKey as TaskStatus };
  }

  if (groupBy === "priority") {
    return {
      priority:
        groupKey === "none" ? null : (groupKey as TaskWithMeta["priority"]),
    };
  }

  if (groupBy === "client_id") {
    return {
      client_id: groupKey === "none" ? null : groupKey,
    };
  }

  if (groupBy === "members") {
    return {
      member_ids: groupKey === "none" ? [] : [groupKey],
    };
  }

  return {};
}

export function getDraftCustomDataForGroup(
  groupKey: string,
  groupBy: string | null,
  fieldType?: string,
): Record<string, unknown> | undefined {
  if (fieldType === "select" && groupBy) {
    return {
      [groupBy]: groupKey === "none" ? null : groupKey,
    };
  }
  return undefined;
}

export function getGroupHeaderMeta(
  groupKey: string,
  groupBy: string | null,
  tasks: TaskWithMeta[],
) {
  if (groupBy === "status") {
    return { type: "status" as const, status: groupKey as TaskStatus };
  }

  const sample = tasks[0];
  if (sample && groupBy) {
    const value = getTaskFieldValue(sample, groupBy);
    return { type: "generic" as const, value: value != null ? String(value) : groupKey };
  }

  return { type: "generic" as const, value: groupKey };
}
