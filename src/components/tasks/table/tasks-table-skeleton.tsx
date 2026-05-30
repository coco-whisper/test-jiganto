"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { ColumnDefinition } from "@/lib/tasks/client-filter";
import { cn } from "@/lib/utils";

interface TasksTableSkeletonProps {
  columns: ColumnDefinition[];
  groupCount?: number;
  rowsPerGroup?: number;
}

function SkeletonCell({ columnId }: { columnId: string }) {
  switch (columnId) {
    case "name":
      return <Skeleton className="h-4 w-[70%] max-w-[220px]" />;
    case "status":
      return <Skeleton className="h-5 w-16 rounded-full" />;
    case "progress":
      return <Skeleton className="h-2 w-full max-w-[120px]" />;
    case "members":
      return (
        <div className="flex -space-x-1">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="size-6 rounded-full" />
        </div>
      );
    case "client_id":
      return <Skeleton className="h-4 w-24" />;
    case "due_date":
      return <Skeleton className="h-4 w-20" />;
    default:
      return <Skeleton className="h-4 w-16" />;
  }
}

function TaskTableGroupSkeleton({
  columns,
  rows,
}: {
  columns: ColumnDefinition[];
  rows: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center gap-2 bg-muted/40 px-4 py-2.5">
        <Skeleton className="size-4 shrink-0" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-3 w-4" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-background">
            <tr>
              <th className="w-8 px-2" />
              {columns.map((column) => (
                <th key={column.id} className="px-3 py-2 text-left">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b bg-background">
                <td className="w-8 px-2">
                  <Skeleton className="mx-auto size-4" />
                </td>
                {columns.map((column, columnIndex) => (
                  <td
                    key={column.id}
                    className={cn(
                      "px-3 py-2 align-middle",
                      columnIndex === 0 && "border-l-4 border-l-muted",
                    )}
                  >
                    <SkeletonCell columnId={column.id} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TasksTableSkeleton({
  columns,
  groupCount = 3,
  rowsPerGroup = 3,
}: TasksTableSkeletonProps) {
  const rowCounts = Array.from({ length: groupCount }, (_, index) =>
    Math.max(2, rowsPerGroup - index),
  );

  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading tasks">
      {rowCounts.map((rows, index) => (
        <TaskTableGroupSkeleton key={index} columns={columns} rows={rows} />
      ))}
    </div>
  );
}
