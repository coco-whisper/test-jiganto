"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { renderTaskCell } from "@/components/tasks/table/task-table-cells";
import type { OrgClient, OrgMember } from "@/hooks/use-org-data";
import type { ColumnDefinition, TaskWithMeta } from "@/lib/tasks/client-filter";
import type { TaskStatus } from "@/lib/database.types";
import { TASK_STATUS_META } from "@/lib/tasks/constants";
import { focusNextFieldInRow } from "@/lib/tasks/keyboard";
import { cn } from "@/lib/utils";

interface SortableTaskRowProps {
  task: TaskWithMeta;
  columns: ColumnDefinition[];
  onPatch: (patch: Record<string, unknown>) => void;
  onExpand: () => void;
  members: OrgMember[];
  clients: OrgClient[];
}

export function SortableTaskRow({
  task,
  columns,
  onPatch,
  onExpand,
  members,
  clients,
}: SortableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const statusColor =
    TASK_STATUS_META[task.status as TaskStatus]?.color ?? "#6366f1";

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab" || event.metaKey || event.ctrlKey) return;
        const row = event.currentTarget;
        event.preventDefault();
        focusNextFieldInRow(row, event.shiftKey ? "prev" : "next");
      }}
      className={cn(
        "border-b bg-background hover:bg-muted/30",
        task.is_archived && "bg-muted/40 text-muted-foreground opacity-70",
        isDragging && "z-10 opacity-60 shadow-md",
      )}
    >
      <td className="w-8 px-2">
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </td>
      {columns.map((column, index) => (
        <td
          key={column.id}
          className={cn("px-3 py-2 align-middle", index === 0 && "border-l-4")}
          style={index === 0 ? { borderLeftColor: statusColor } : undefined}
        >
          {renderTaskCell(column, {
            task,
            onPatch,
            onExpand,
            members,
            clients,
          })}
        </td>
      ))}
      <td className="w-10" />
    </tr>
  );
}
