"use client";

import { useEffect, useRef } from "react";

import { renderTaskCell } from "@/components/tasks/table/task-table-cells";
import { Input } from "@/components/ui/input";
import type { OrgClient, OrgMember } from "@/hooks/use-org-data";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import type { ColumnDefinition } from "@/lib/tasks/client-filter";
import type { TaskStatus } from "@/lib/database.types";
import { focusNextFieldInRow } from "@/lib/tasks/keyboard";
import { cn } from "@/lib/utils";

export interface DraftTaskValues {
  name: string;
  status: TaskStatus;
  priority: TaskWithMeta["priority"];
  due_date: string | null;
  start_date: string | null;
  client_id: string | null;
  member_ids: string[];
  progress: number;
}

interface DraftTaskRowProps {
  columns: ColumnDefinition[];
  values: DraftTaskValues;
  onChange: (values: DraftTaskValues) => void;
  onSave: () => void;
  onCancel: () => void;
  members: OrgMember[];
  clients: OrgClient[];
  statusBorderColor: string;
  autoFocus?: boolean;
}

export function DraftTaskRow({
  columns,
  values,
  onChange,
  onSave,
  onCancel,
  members,
  clients,
  statusBorderColor,
  autoFocus = true,
}: DraftTaskRowProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const draftTask = {
    id: "draft",
    name: values.name || "",
    status: values.status,
    priority: values.priority,
    due_date: values.due_date,
    start_date: values.start_date,
    client_id: values.client_id,
    member_ids: values.member_ids,
    progress: values.progress,
    progress_source: "manual" as const,
    progress_label: `${values.progress}%`,
    project_id: null,
    org_id: "",
    description: null,
    position: 0,
    is_archived: false,
    custom_data: {},
    created_by: null,
    created_at: "",
    updated_at: "",
  } as TaskWithMeta;

  useEffect(() => {
    if (autoFocus) {
      nameRef.current?.focus();
    }
  }, [autoFocus]);

  function patchDraft(patch: Record<string, unknown>) {
    onChange({
      ...values,
      ...(patch.name !== undefined && { name: String(patch.name) }),
      ...(patch.status !== undefined && {
        status: patch.status as TaskStatus,
      }),
      ...(patch.priority !== undefined && {
        priority: patch.priority as DraftTaskValues["priority"],
      }),
      ...(patch.due_date !== undefined && {
        due_date: patch.due_date as string | null,
      }),
      ...(patch.start_date !== undefined && {
        start_date: patch.start_date as string | null,
      }),
      ...(patch.client_id !== undefined && {
        client_id: patch.client_id as string | null,
      }),
      ...(patch.member_ids !== undefined && {
        member_ids: patch.member_ids as string[],
      }),
      ...(patch.progress !== undefined && {
        progress: patch.progress as number,
      }),
    });
  }

  return (
    <tr
      className="border-b bg-primary/5"
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onSave();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
        if (event.key === "Tab" && !event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          focusNextFieldInRow(
            event.currentTarget,
            event.shiftKey ? "prev" : "next",
          );
        }
      }}
    >
      <td className="w-8 px-2" />
      {columns.map((column, index) => (
        <td
          key={column.id}
          className={cn("px-3 py-2", index === 0 && "border-l-4")}
          style={index === 0 ? { borderLeftColor: statusBorderColor } : undefined}
        >
          {column.id === "name" ? (
            <Input
              ref={nameRef}
              value={values.name}
              onChange={(event) =>
                onChange({ ...values, name: event.target.value })
              }
              placeholder="Task name..."
              className="h-8 font-semibold"
            />
          ) : (
            renderTaskCell(column, {
              task: draftTask,
              onPatch: patchDraft,
              onExpand: () => undefined,
              members,
              clients,
            })
          )}
        </td>
      ))}
      <td className="w-10" />
    </tr>
  );
}
