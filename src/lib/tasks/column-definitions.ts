import type { ColumnDefinition } from "@/lib/tasks/client-filter";

export const BUILT_IN_COLUMNS: ColumnDefinition[] = [
  {
    id: "name",
    label: "Task Name",
    defaultVisible: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "status",
    label: "Status",
    defaultVisible: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "progress",
    label: "Progress",
    defaultVisible: true,
    sortable: true,
    filterable: false,
  },
  {
    id: "members",
    label: "Members",
    defaultVisible: true,
    sortable: false,
    filterable: true,
  },
  {
    id: "client_id",
    label: "Client",
    defaultVisible: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "due_date",
    label: "Due Date",
    defaultVisible: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "priority",
    label: "Priority",
    defaultVisible: false,
    sortable: true,
    filterable: true,
  },
  {
    id: "start_date",
    label: "Start Date",
    defaultVisible: false,
    sortable: true,
    filterable: true,
  },
];

export const VIEW_MODE_OPTIONS = [
  { value: "table", label: "Table", icon: "⊞" },
  { value: "kanban", label: "Kanban", icon: "🔀" },
  { value: "timeline", label: "Timeline", icon: "📅" },
  { value: "calendar", label: "Calendar", icon: "🗓" },
  { value: "board", label: "Board", icon: "▦" },
] as const;

export const FILTERABLE_COLUMNS = BUILT_IN_COLUMNS.filter(
  (column) => column.filterable,
);

export const SORTABLE_COLUMNS = BUILT_IN_COLUMNS.filter(
  (column) => column.sortable,
);

export const GROUPABLE_COLUMNS = BUILT_IN_COLUMNS.filter(
  (column) => column.id !== "progress" && column.id !== "members",
);

export function getColumnLayoutStorageKey(projectId?: string | null): string {
  return `jiganto-column-layout:${projectId ?? "standalone"}`;
}

export function loadColumnLayout(projectId?: string | null) {
  if (typeof window === "undefined") {
    return { order: BUILT_IN_COLUMNS.map((column) => column.id), labels: {} };
  }

  try {
    const raw = window.localStorage.getItem(getColumnLayoutStorageKey(projectId));
    if (!raw) {
      return {
        order: BUILT_IN_COLUMNS.map((column) => column.id),
        labels: {},
      };
    }

    return JSON.parse(raw) as {
      order: string[];
      labels: Record<string, string>;
    };
  } catch {
    return {
      order: BUILT_IN_COLUMNS.map((column) => column.id),
      labels: {},
    };
  }
}

export function saveColumnLayout(
  projectId: string | null | undefined,
  layout: { order: string[]; labels: Record<string, string> },
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    getColumnLayoutStorageKey(projectId),
    JSON.stringify(layout),
  );
}

export function getVisibleColumns(
  hiddenColumns: string[],
  columnLayout: { order: string[]; labels: Record<string, string> },
): ColumnDefinition[] {
  const hidden = new Set(hiddenColumns);
  const byId = new Map(BUILT_IN_COLUMNS.map((column) => [column.id, column]));

  const orderedIds =
    columnLayout.order.length > 0
      ? columnLayout.order
      : BUILT_IN_COLUMNS.map((column) => column.id);

  return orderedIds
    .map((id) => byId.get(id))
    .filter((column): column is ColumnDefinition => Boolean(column))
    .filter((column) => !hidden.has(column.id))
    .map((column) => ({
      ...column,
      label: columnLayout.labels[column.id] ?? column.label,
    }));
}
