import type { CustomColumnRow } from "@/lib/custom-columns/types";
import type { ColumnDefinition } from "@/lib/tasks/client-filter";
import {
  BUILT_IN_COLUMNS,
  getVisibleColumns,
} from "@/lib/tasks/column-definitions";

import { customColumnToDefinition } from "./types";

export function buildTableColumnDefinitions(
  hiddenColumns: string[],
  columnLayout: { order: string[]; labels: Record<string, string> },
  customColumns: CustomColumnRow[],
): ColumnDefinition[] {
  const hidden = new Set(hiddenColumns);
  const builtIn = getVisibleColumns(hiddenColumns, columnLayout);

  const custom = customColumns
    .filter((column) => column.is_visible && !hidden.has(column.id))
    .sort((left, right) => left.position - right.position)
    .map((column) => customColumnToDefinition(column));

  return [...builtIn, ...custom];
}

export function splitTableColumns(columns: ColumnDefinition[]) {
  const builtInIds = new Set(BUILT_IN_COLUMNS.map((column) => column.id));
  const builtIn = columns.filter((column) => builtInIds.has(column.id));
  const custom = columns.filter((column) => !builtInIds.has(column.id));
  return { builtIn, custom };
}

export function sumNumberColumn(
  tasks: {
    custom_data: import("@/lib/database.types").Json;
    is_archived?: boolean;
  }[],
  columnId: string,
): number | null {
  let sum = 0;
  let hasValue = false;

  for (const task of tasks) {
    if (task.is_archived) continue;
    const data = task.custom_data;
    if (typeof data !== "object" || data === null || Array.isArray(data)) continue;
    const raw = (data as Record<string, unknown>)[columnId];
    const num =
      typeof raw === "number"
        ? raw
        : typeof raw === "string" && raw !== ""
          ? Number.parseFloat(raw)
          : NaN;
    if (!Number.isNaN(num)) {
      sum += num;
      hasValue = true;
    }
  }

  return hasValue ? sum : null;
}
