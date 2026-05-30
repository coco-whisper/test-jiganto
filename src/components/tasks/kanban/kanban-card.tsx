"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { AlertTriangle } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { OrgMember } from "@/hooks/use-org-data";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import type { TaskPriority } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: "#dc2626",
  medium: "#d97706",
  low: "#2563eb",
};

interface KanbanCardProps {
  task: TaskWithMeta;
  members: OrgMember[];
  onOpen: () => void;
}

function memberInitials(member: OrgMember) {
  const name = member.display_name ?? member.email;
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function progressBarColor(percent: number) {
  if (percent >= 70) return "bg-emerald-500";
  if (percent >= 40) return "bg-amber-500";
  return "bg-red-500";
}

export function KanbanCard({ task, members, onOpen }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const assignee = members.find((member) =>
    (task.member_ids ?? []).includes(member.id),
  );
  const percent = task.progress ?? 0;
  const isOverdue =
    task.due_date &&
    isBefore(parseISO(task.due_date), startOfDay(new Date())) &&
    task.status !== "completed";

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
      }}
      className={cn(
        "cursor-grab rounded-md border bg-background p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        task.is_archived && "border-dashed bg-muted/50 opacity-70",
        isDragging && "opacity-40",
      )}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-2">
        {task.priority ? (
          <span
            className="mt-1.5 size-2 shrink-0 rounded-full"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
            title={`${task.priority} priority`}
          />
        ) : (
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-muted" />
        )}
        <p className="flex-1 text-sm font-medium leading-snug">{task.name}</p>
      </div>

      {task.due_date ? (
        <p
          className={cn(
            "mt-2 font-mono text-[11px]",
            isOverdue ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {format(parseISO(task.due_date), "MMM d")}
          {isOverdue ? (
            <AlertTriangle className="ml-1 inline size-3" />
          ) : null}
        </p>
      ) : null}

      <div className="mt-2 flex items-center gap-2">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full", progressBarColor(percent))}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {task.progress_label ?? `${percent}%`}
        </span>
      </div>

      <div className="mt-2 flex justify-end">
        {assignee ? (
          <Avatar className="size-6">
            <AvatarFallback className="text-[9px]">
              {memberInitials(assignee)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="text-[10px] text-muted-foreground">Unassigned</span>
        )}
      </div>
    </div>
  );
}
