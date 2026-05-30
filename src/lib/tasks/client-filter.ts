import type {
  CustomFieldType,
  Json,
  Task,
  TaskPriority,
  TaskStatus,
  ViewMode,
} from "@/lib/database.types";
import type { ColumnConfig, ColumnOption } from "@/lib/custom-columns/types";

export interface TaskWithMeta extends Task {
  member_ids?: string[];
  progress_source?: "sub_tasks" | "manual";
  progress_label?: string;
}

export interface SortLevel {
  column: string;
  direction: "asc" | "desc";
}

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "is_empty"
  | "is_not_empty";

export interface TaskFilter {
  id: string;
  column: string;
  operator: FilterOperator;
  value?: string;
}

export interface ColumnDefinition {
  id: string;
  label: string;
  defaultVisible: boolean;
  sortable: boolean;
  filterable: boolean;
  isCustom?: boolean;
  fieldType?: CustomFieldType;
  options?: ColumnOption[];
  config?: ColumnConfig;
}

export interface ColumnLayout {
  order: string[];
  labels: Record<string, string>;
}

import {
  DEFAULT_CALENDAR_CONFIG,
  type CalendarConfig,
} from "@/lib/tasks/calendar-config";
import {
  DEFAULT_KANBAN_CONFIG,
  type KanbanConfig,
} from "@/lib/tasks/kanban-config";
import {
  DEFAULT_TIMELINE_CONFIG,
  type TimelineConfig,
} from "@/lib/tasks/timeline-config";

export type { CalendarConfig } from "@/lib/tasks/calendar-config";
export type { KanbanConfig } from "@/lib/tasks/kanban-config";
export type { TimelineConfig } from "@/lib/tasks/timeline-config";

export interface ViewPreferencesState {
  view_mode: ViewMode;
  group_by: string | null;
  sort_config: SortLevel[];
  hidden_columns: string[];
  filters: TaskFilter[];
  kanban_config: KanbanConfig;
  calendar_config: CalendarConfig;
  timeline_config: TimelineConfig;
}

export const DEFAULT_VIEW_PREFERENCES: ViewPreferencesState = {
  view_mode: "table",
  group_by: "status",
  sort_config: [],
  hidden_columns: ["priority"],
  filters: [],
  kanban_config: DEFAULT_KANBAN_CONFIG,
  calendar_config: DEFAULT_CALENDAR_CONFIG,
  timeline_config: DEFAULT_TIMELINE_CONFIG,
};

export function parseSortConfig(value: Json | null | undefined): SortLevel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is Record<string, Json | undefined> =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    )
    .map((item) => ({
      column: String(item.column ?? ""),
      direction: (item.direction === "desc" ? "desc" : "asc") as "asc" | "desc",
    }))
    .filter((item) => item.column.length > 0);
}

export function parseHiddenColumns(value: Json | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return DEFAULT_VIEW_PREFERENCES.hidden_columns;
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function parseFilters(value: Json | null | undefined): TaskFilter[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is Record<string, Json | undefined> =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    )
    .map((item) => ({
      id: String(item.id ?? crypto.randomUUID()),
      column: String(item.column ?? ""),
      operator: (item.operator as FilterOperator) ?? "equals",
      value: item.value != null ? String(item.value) : undefined,
    }))
    .filter((item) => item.column.length > 0);
}

export function getTaskFieldValue(
  task: TaskWithMeta,
  column: string,
): string | number | boolean | null | undefined {
  if (column in task && column !== "custom_data") {
    const value = task[column as keyof TaskWithMeta];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      return value;
    }
  }

  if (column === "members") {
    return task.member_ids?.join(",") ?? "";
  }

  const customData = task.custom_data;
  if (
    typeof customData === "object" &&
    customData !== null &&
    !Array.isArray(customData) &&
    column in customData
  ) {
    const value = customData[column];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      return value;
    }

    return value != null ? JSON.stringify(value) : null;
  }

  return null;
}

export function matchesSearch(task: TaskWithMeta, query: string): boolean {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  const haystacks = [
    task.name,
    task.description ?? "",
    task.status,
    task.priority ?? "",
    task.due_date ?? "",
    task.start_date ?? "",
    ...(task.member_ids ?? []),
  ];

  if (
    typeof task.custom_data === "object" &&
    task.custom_data !== null &&
    !Array.isArray(task.custom_data)
  ) {
    haystacks.push(
      ...Object.values(task.custom_data).map((value) =>
        value == null ? "" : String(value),
      ),
    );
  }

  return haystacks.some((value) => value.toLowerCase().includes(normalized));
}

export function matchesFilter(task: TaskWithMeta, filter: TaskFilter): boolean {
  const raw = getTaskFieldValue(task, filter.column);
  const value =
    raw == null ? "" : typeof raw === "string" ? raw : String(raw);
  const normalized = value.toLowerCase();
  const filterValue = (filter.value ?? "").toLowerCase();

  switch (filter.operator) {
    case "equals":
      return normalized === filterValue;
    case "not_equals":
      return normalized !== filterValue;
    case "contains":
      return normalized.includes(filterValue);
    case "is_empty":
      return value.length === 0;
    case "is_not_empty":
      return value.length > 0;
    default:
      return true;
  }
}

export function applyTaskPipeline(
  tasks: TaskWithMeta[],
  options: {
    search: string;
    filters: TaskFilter[];
    sortConfig: SortLevel[];
  },
): TaskWithMeta[] {
  let result = tasks.filter(
    (task) =>
      matchesSearch(task, options.search) &&
      options.filters.every((filter) => matchesFilter(task, filter)),
  );

  if (options.sortConfig.length > 0) {
    result = [...result].sort((left, right) => {
      for (const level of options.sortConfig) {
        const leftValue = getTaskFieldValue(left, level.column);
        const rightValue = getTaskFieldValue(right, level.column);

        if (leftValue == null && rightValue == null) continue;
        if (leftValue == null) return level.direction === "asc" ? 1 : -1;
        if (rightValue == null) return level.direction === "asc" ? -1 : 1;

        if (leftValue < rightValue) {
          return level.direction === "asc" ? -1 : 1;
        }

        if (leftValue > rightValue) {
          return level.direction === "asc" ? 1 : -1;
        }
      }

      return left.position - right.position;
    });
  } else {
    result = [...result].sort((left, right) => left.position - right.position);
  }

  return result;
}

export function groupTasksByColumn(
  tasks: TaskWithMeta[],
  groupBy: string | null,
): Array<{ key: string; label: string; tasks: TaskWithMeta[] }> {
  if (!groupBy) {
    return [{ key: "all", label: "All tasks", tasks }];
  }

  const groups = new Map<string, TaskWithMeta[]>();

  for (const task of tasks) {
    const raw = getTaskFieldValue(task, groupBy);
    const key = raw == null || raw === "" ? "none" : String(raw);
    const existing = groups.get(key) ?? [];
    existing.push(task);
    groups.set(key, existing);
  }

  return Array.from(groups.entries()).map(([key, groupedTasks]) => ({
    key,
    label: key === "none" ? "Unassigned" : key.replaceAll("_", " "),
    tasks: groupedTasks,
  }));
}

export function formatStatusLabel(status: TaskStatus | string): string {
  return status.replaceAll("_", " ");
}

export function formatPriorityLabel(priority: TaskPriority | null): string {
  if (!priority) return "—";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}
