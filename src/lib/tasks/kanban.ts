import type { OrgClient, OrgMember } from "@/hooks/use-org-data";
import type { CustomColumnRow } from "@/lib/custom-columns/types";
import { parseColumnOptions } from "@/lib/custom-columns/types";
import type { Json, TaskPriority, TaskStatus } from "@/lib/database.types";
import {
  formatStatusLabel,
  getTaskFieldValue,
  type TaskWithMeta,
} from "@/lib/tasks/client-filter";
import { TASK_STATUSES, TASK_STATUS_META } from "@/lib/tasks/constants";
import { sortTasksArchivedLast } from "@/lib/tasks/csv";
import { buildTableGroups, type TableGroup } from "@/lib/tasks/table-groups";

function sortKanbanGroups(groups: TableGroup[]): TableGroup[] {
  return groups.map((group) => ({
    ...group,
    tasks: sortTasksArchivedLast(group.tasks),
  }));
}

export function getTaskKanbanColumnKey(
  task: TaskWithMeta,
  groupBy: string | null,
): string {
  if (!groupBy) return "all";

  if (groupBy === "members") {
    const ids = task.member_ids ?? [];
    return ids.length > 0 ? ids[0] : "none";
  }

  if (groupBy === "status") {
    return task.status;
  }

  if (groupBy === "priority") {
    return task.priority ?? "none";
  }

  if (groupBy === "client_id") {
    return task.client_id ?? "none";
  }

  const raw = getTaskFieldValue(task, groupBy);
  if (raw == null || raw === "") return "none";
  return String(raw);
}

export function buildKanbanColumns(
  tasks: TaskWithMeta[],
  groupBy: string | null,
  members: OrgMember[],
  clients: OrgClient[],
  customColumns: CustomColumnRow[],
): TableGroup[] {
  if (groupBy === "members") {
    const byMember = new Map<string, TaskWithMeta[]>();
    byMember.set("none", []);

    for (const member of members) {
      byMember.set(member.id, []);
    }

    for (const task of tasks) {
      const key = getTaskKanbanColumnKey(task, groupBy);
      if (!byMember.has(key)) {
        byMember.set(key, []);
      }
      byMember.get(key)!.push(task);
    }

    const columns: TableGroup[] = [
      {
        key: "none",
        label: "Unassigned",
        tasks: byMember.get("none") ?? [],
      },
    ];

    for (const member of members) {
      columns.push({
        key: member.id,
        label: member.display_name ?? member.email.split("@")[0],
        tasks: byMember.get(member.id) ?? [],
      });
    }

    return sortKanbanGroups(columns);
  }

  if (groupBy === "client_id") {
    const byClient = new Map<string, TaskWithMeta[]>();
    byClient.set("none", []);

    for (const client of clients) {
      byClient.set(client.id, []);
    }

    for (const task of tasks) {
      const key = task.client_id ?? "none";
      const list = byClient.get(key) ?? [];
      list.push(task);
      byClient.set(key, list);
    }

    const columns: TableGroup[] = [
      { key: "none", label: "No client", tasks: byClient.get("none") ?? [] },
    ];

    for (const client of clients) {
      columns.push({
        key: client.id,
        label: client.name,
        tasks: byClient.get(client.id) ?? [],
      });
    }

    return sortKanbanGroups(columns);
  }

  const customColumn = groupBy
    ? customColumns.find((column) => column.id === groupBy)
    : undefined;
  if (customColumn?.field_type === "select" && groupBy) {
    const options = parseColumnOptions(customColumn.options);
    const byOption = new Map<string, TaskWithMeta[]>();
    byOption.set("none", []);

    for (const option of options) {
      byOption.set(option.label, []);
    }

    for (const task of tasks) {
      const data = task.custom_data;
      const raw =
        typeof data === "object" && data !== null && !Array.isArray(data)
          ? (data as Record<string, Json>)[groupBy]
          : null;
      const key = raw != null && raw !== "" ? String(raw) : "none";
      if (!byOption.has(key)) {
        byOption.set(key, []);
      }
      byOption.get(key)!.push(task);
    }

    const columns: TableGroup[] = [
      { key: "none", label: "Unset", tasks: byOption.get("none") ?? [] },
    ];

    for (const option of options) {
      columns.push({
        key: option.label,
        label: option.label,
        tasks: byOption.get(option.label) ?? [],
      });
    }

    return sortKanbanGroups(columns);
  }

  if (groupBy === "priority") {
    const order: Array<TaskPriority | "none"> = ["high", "medium", "low", "none"];
    const grouped = new Map(
      order.map((key) => [key, [] as TaskWithMeta[]]),
    );

    for (const task of tasks) {
      const key = task.priority ?? "none";
      grouped.get(key)?.push(task);
    }

    return sortKanbanGroups(
      order.map((key) => ({
        key,
        label:
          key === "none"
            ? "No priority"
            : key.charAt(0).toUpperCase() + key.slice(1),
        tasks: grouped.get(key) ?? [],
      })),
    );
  }

  return buildTableGroups(tasks, groupBy);
}

export function getKanbanColumnStyle(
  groupBy: string | null,
  columnKey: string,
): { color?: string; bgColor?: string } {
  if (groupBy === "status" && TASK_STATUSES.includes(columnKey as TaskStatus)) {
    const meta = TASK_STATUS_META[columnKey as TaskStatus];
    return { color: meta.color, bgColor: meta.bgColor };
  }
  return {};
}

export function getKanbanColumnLabel(
  groupBy: string | null,
  columnKey: string,
  fallback: string,
): string {
  if (groupBy === "status") {
    return formatStatusLabel(columnKey);
  }
  return fallback;
}

export function buildKanbanMovePatch(
  groupBy: string | null,
  targetKey: string,
  customColumns: CustomColumnRow[],
): Record<string, unknown> {
  if (!groupBy) return {};

  switch (groupBy) {
    case "status":
      if (TASK_STATUSES.includes(targetKey as TaskStatus)) {
        return { status: targetKey };
      }
      return {};
    case "priority":
      return {
        priority: targetKey === "none" ? null : (targetKey as TaskPriority),
      };
    case "client_id":
      return {
        client_id: targetKey === "none" ? null : targetKey,
      };
    case "members":
      return {
        member_ids: targetKey === "none" ? [] : [targetKey],
      };
    default: {
      const customColumn = customColumns.find((column) => column.id === groupBy);
      if (customColumn?.field_type === "select") {
        return {
          custom_data: {
            [groupBy]: targetKey === "none" ? null : targetKey,
          },
        };
      }
      if (groupBy in { name: 1, due_date: 1, start_date: 1 }) {
        return { [groupBy]: targetKey === "none" ? null : targetKey };
      }
      return {};
    }
  }
}

export function resolveKanbanDropColumnKey(
  overId: string | number,
  tasks: TaskWithMeta[],
  groupBy: string | null,
): string | null {
  const id = String(overId);

  if (id.startsWith("column:")) {
    return id.replace("column:", "");
  }

  const overTask = tasks.find((task) => task.id === id);
  if (overTask) {
    return getTaskKanbanColumnKey(overTask, groupBy);
  }

  return null;
}
