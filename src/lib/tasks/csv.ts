import type { OrgClient, OrgMember } from "@/hooks/use-org-data";
import { getTaskCustomData } from "@/lib/custom-columns/types";
import type { ColumnDefinition, TaskWithMeta } from "@/lib/tasks/client-filter";
import { formatStatusLabel } from "@/lib/tasks/client-filter";
import type { TaskPriority, TaskStatus } from "@/lib/database.types";
import { TASK_STATUSES } from "@/lib/tasks/constants";

export const CSV_ID_HEADER = "ID";
export const CSV_DESCRIPTION_HEADER = "Description";
export const CSV_ARCHIVED_HEADER = "Archived";

export type ImportFieldKey =
  | ""
  | "id"
  | "name"
  | "status"
  | "progress"
  | "members"
  | "client"
  | "due_date"
  | "start_date"
  | "priority"
  | "description"
  | "is_archived"
  | `custom:${string}`;

export interface ExportColumnSpec {
  key: ImportFieldKey;
  header: string;
}

export interface ParsedImportRow {
  id?: string;
  name: string;
  status?: TaskStatus;
  progress?: number;
  member_emails?: string[];
  client_name?: string | null;
  due_date?: string | null;
  start_date?: string | null;
  priority?: TaskPriority | null;
  description?: string | null;
  is_archived?: boolean;
  custom_data?: Record<string, unknown>;
}

const BUILT_IN_EXPORT_SPECS: ExportColumnSpec[] = [
  { key: "id", header: CSV_ID_HEADER },
  { key: "name", header: "Task Name" },
  { key: "status", header: "Status" },
  { key: "progress", header: "Progress" },
  { key: "members", header: "Members" },
  { key: "client", header: "Client" },
  { key: "due_date", header: "Due Date" },
  { key: "start_date", header: "Start Date" },
  { key: "priority", header: "Priority" },
  { key: "description", header: CSV_DESCRIPTION_HEADER },
  { key: "is_archived", header: CSV_ARCHIVED_HEADER },
];

export function buildExportColumns(
  visibleColumns: ColumnDefinition[],
): ExportColumnSpec[] {
  const specs: ExportColumnSpec[] = [{ key: "id", header: CSV_ID_HEADER }];

  for (const column of visibleColumns) {
    if (column.isCustom) {
      specs.push({ key: `custom:${column.id}`, header: column.label });
      continue;
    }

    const builtIn = BUILT_IN_EXPORT_SPECS.find(
      (spec) =>
        spec.key !== "id" &&
        (spec.key === column.id ||
          (spec.key === "client" && column.id === "client_id")),
    );

    if (builtIn) {
      specs.push({ ...builtIn, header: column.label });
    }
  }

  const hasDescription = specs.some((spec) => spec.key === "description");
  if (!hasDescription) {
    specs.push({ key: "description", header: CSV_DESCRIPTION_HEADER });
  }

  const hasArchived = specs.some((spec) => spec.key === "is_archived");
  if (!hasArchived) {
    specs.push({ key: "is_archived", header: CSV_ARCHIVED_HEADER });
  }

  return specs;
}

export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      if (char === "\r") index += 1;
      continue;
    }

    if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
}

function formatMembers(
  task: TaskWithMeta,
  members: OrgMember[],
): string {
  const ids = task.member_ids ?? [];
  return ids
    .map((id) => {
      const member = members.find((item) => item.id === id);
      return member?.email ?? id;
    })
    .filter(Boolean)
    .join("; ");
}

function formatCustomValue(
  task: TaskWithMeta,
  column: ColumnDefinition,
  members: OrgMember[],
): string {
  const raw = getTaskCustomData(task)[column.id];

  if (raw == null || raw === "") return "";

  switch (column.fieldType) {
    case "checkbox":
      return raw === true || raw === "true" ? "true" : "false";
    case "multi_select":
      return Array.isArray(raw) ? raw.map(String).join("; ") : String(raw);
    case "person": {
      const member = members.find((item) => item.id === String(raw));
      return member?.email ?? String(raw);
    }
    case "rating":
      return String(raw);
    default:
      return String(raw);
  }
}

export function getExportCellValue(
  task: TaskWithMeta,
  spec: ExportColumnSpec,
  context: {
    members: OrgMember[];
    clients: OrgClient[];
    columnsById: Map<string, ColumnDefinition>;
  },
): string {
  switch (spec.key) {
    case "id":
      return task.id;
    case "name":
      return task.name;
    case "status":
      return formatStatusLabel(task.status);
    case "progress":
      return task.progress_label ?? `${task.progress}%`;
    case "members":
      return formatMembers(task, context.members);
    case "client": {
      const client = context.clients.find((item) => item.id === task.client_id);
      return client?.name ?? "";
    }
    case "due_date":
      return task.due_date ?? "";
    case "start_date":
      return task.start_date ?? "";
    case "priority":
      return task.priority ?? "";
    case "description":
      return task.description ?? "";
    case "is_archived":
      return task.is_archived ? "true" : "false";
    default: {
      if (!spec.key.startsWith("custom:")) return "";
      const columnId = spec.key.slice("custom:".length);
      const column = context.columnsById.get(columnId);
      if (!column) return "";
      return formatCustomValue(task, column, context.members);
    }
  }
}

export function buildCsvContent(
  tasks: TaskWithMeta[],
  exportColumns: ExportColumnSpec[],
  context: {
    members: OrgMember[];
    clients: OrgClient[];
    columnsById: Map<string, ColumnDefinition>;
  },
): string {
  const headerLine = exportColumns
    .map((column) => escapeCsvCell(column.header))
    .join(",");

  const dataLines = tasks.map((task) =>
    exportColumns
      .map((spec) =>
        escapeCsvCell(
          getExportCellValue(task, spec, context),
        ),
      )
      .join(","),
  );

  return `\uFEFF${[headerLine, ...dataLines].join("\r\n")}`;
}

export function downloadCsvFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const HEADER_ALIASES: Record<string, ImportFieldKey> = {
  id: "id",
  "task id": "id",
  "task name": "name",
  name: "name",
  status: "status",
  progress: "progress",
  members: "members",
  member: "members",
  assignees: "members",
  client: "client",
  "due date": "due_date",
  due_date: "due_date",
  "start date": "start_date",
  start_date: "start_date",
  priority: "priority",
  description: "description",
  notes: "description",
  archived: "is_archived",
  "is archived": "is_archived",
};

export function guessFieldMapping(
  headers: string[],
  visibleColumns: ColumnDefinition[],
): Record<number, ImportFieldKey> {
  const mapping: Record<number, ImportFieldKey> = {};
  const labelToCustom = new Map(
    visibleColumns
      .filter((column) => column.isCustom)
      .map((column) => [column.label.trim().toLowerCase(), column.id]),
  );

  headers.forEach((header, index) => {
    const normalized = header.trim().toLowerCase();
    const alias = HEADER_ALIASES[normalized];
    if (alias) {
      mapping[index] = alias;
      return;
    }

    const builtIn = BUILT_IN_EXPORT_SPECS.find(
      (spec) => spec.header.toLowerCase() === normalized,
    );
    if (builtIn) {
      mapping[index] = builtIn.key;
      return;
    }

    const customId = labelToCustom.get(normalized);
    if (customId) {
      mapping[index] = `custom:${customId}`;
    }
  });

  return mapping;
}

export function getImportFieldOptions(
  visibleColumns: ColumnDefinition[],
): Array<{ value: ImportFieldKey; label: string }> {
  const options: Array<{ value: ImportFieldKey; label: string }> = [
    { value: "", label: "Skip column" },
    { value: "id", label: "ID (update existing)" },
    { value: "name", label: "Task Name" },
    { value: "status", label: "Status" },
    { value: "progress", label: "Progress" },
    { value: "members", label: "Members (emails)" },
    { value: "client", label: "Client" },
    { value: "due_date", label: "Due Date" },
    { value: "start_date", label: "Start Date" },
    { value: "priority", label: "Priority" },
    { value: "description", label: "Description" },
    { value: "is_archived", label: "Archived" },
  ];

  for (const column of visibleColumns) {
    if (column.isCustom) {
      options.push({
        value: `custom:${column.id}`,
        label: column.label,
      });
    }
  }

  return options;
}

function normalizeStatus(value: string): TaskStatus | undefined {
  const normalized = value.trim().toLowerCase().replaceAll(" ", "_");
  if (TASK_STATUSES.includes(normalized as TaskStatus)) {
    return normalized as TaskStatus;
  }

  const byLabel = TASK_STATUSES.find(
    (status) => formatStatusLabel(status) === value.trim().toLowerCase(),
  );
  return byLabel;
}

function parseProgress(value: string): number | undefined {
  const match = value.match(/(\d+)\s*%?/);
  if (!match) return undefined;
  const num = Number.parseInt(match[1], 10);
  if (Number.isNaN(num)) return undefined;
  return Math.min(100, Math.max(0, num));
}

function parseBool(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "1"].includes(normalized)) return true;
  if (["false", "no", "0", ""].includes(normalized)) return false;
  return undefined;
}

export function rowsToImportPayload(
  csvRows: string[][],
  mapping: Record<number, ImportFieldKey>,
): ParsedImportRow[] {
  if (csvRows.length < 2) return [];

  const dataRows = csvRows.slice(1);

  return dataRows
    .map((cells) => {
      const row: ParsedImportRow = { name: "" };
      const custom_data: Record<string, unknown> = {};

      for (const [indexKey, field] of Object.entries(mapping)) {
        const index = Number(indexKey);
        if (!field) continue;

        const raw = (cells[index] ?? "").trim();
        if (!raw && field !== "is_archived") continue;

        switch (field) {
          case "id":
            row.id = raw;
            break;
          case "name":
            row.name = raw;
            break;
          case "status": {
            const status = normalizeStatus(raw);
            if (status) row.status = status;
            break;
          }
          case "progress": {
            const progress = parseProgress(raw);
            if (progress !== undefined) row.progress = progress;
            break;
          }
          case "members":
            row.member_emails = raw
              .split(/[;,]/)
              .map((email) => email.trim())
              .filter(Boolean);
            break;
          case "client":
            row.client_name = raw || null;
            break;
          case "due_date":
            row.due_date = raw || null;
            break;
          case "start_date":
            row.start_date = raw || null;
            break;
          case "priority":
            row.priority =
              raw === ""
                ? null
                : (raw.toLowerCase() as TaskPriority);
            break;
          case "description":
            row.description = raw || null;
            break;
          case "is_archived": {
            const archived = parseBool(raw);
            if (archived !== undefined) row.is_archived = archived;
            break;
          }
          default: {
            if (field.startsWith("custom:")) {
              custom_data[field.slice("custom:".length)] = raw;
            }
          }
        }
      }

      if (Object.keys(custom_data).length > 0) {
        row.custom_data = custom_data;
      }

      return row;
    })
    .filter((row) => row.name.trim().length > 0);
}

export function sortTasksArchivedLast<T extends { is_archived: boolean }>(
  tasks: T[],
): T[] {
  const active: T[] = [];
  const archived: T[] = [];

  for (const task of tasks) {
    if (task.is_archived) {
      archived.push(task);
    } else {
      active.push(task);
    }
  }

  return [...active, ...archived];
}

export function tasksForProgressMetrics<T extends { is_archived: boolean }>(
  tasks: T[],
): T[] {
  return tasks.filter((task) => !task.is_archived);
}
