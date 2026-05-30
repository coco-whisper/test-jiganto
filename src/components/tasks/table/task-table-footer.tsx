"use client";

import { formatNumberDisplay } from "@/components/tasks/table/custom-field-cells";
import { sumNumberColumn } from "@/lib/custom-columns/merge-columns";
import type { ColumnDefinition, TaskWithMeta } from "@/lib/tasks/client-filter";
import { tasksForProgressMetrics } from "@/lib/tasks/csv";

interface TaskTableFooterProps {
  columns: ColumnDefinition[];
  tasks: TaskWithMeta[];
}

export function TaskTableFooter({ columns, tasks }: TaskTableFooterProps) {
  const metricTasks = tasksForProgressMetrics(tasks);
  const numberColumns = columns.filter(
    (column) => column.isCustom && column.fieldType === "number",
  );

  if (numberColumns.length === 0) return null;

  let colIndex = 0;

  return (
    <tfoot className="border-t bg-muted/30">
      <tr>
        <td className="w-8 px-2" />
        {columns.map((column) => {
          const isFirst = colIndex === 0;
          colIndex += 1;

          if (column.isCustom && column.fieldType === "number") {
            const sum = sumNumberColumn(metricTasks, column.id);
            return (
              <td
                key={column.id}
                className="px-3 py-2 text-xs font-medium tabular-nums text-muted-foreground"
              >
                Σ {formatNumberDisplay(sum, column.config)}
              </td>
            );
          }

          return (
            <td key={column.id} className="px-3 py-2">
              {isFirst ? (
                <span className="text-xs font-medium text-muted-foreground">
                  Total
                </span>
              ) : null}
            </td>
          );
        })}
        <td className="w-10" />
      </tr>
    </tfoot>
  );
}
