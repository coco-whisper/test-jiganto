"use client";

import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { renderCustomFieldCell } from "@/components/tasks/table/custom-field-cells";
import type { OrgClient, OrgMember } from "@/hooks/use-org-data";
import type { TaskPriority, TaskStatus } from "@/lib/database.types";
import type { ColumnDefinition, TaskWithMeta } from "@/lib/tasks/client-filter";
import { formatStatusLabel } from "@/lib/tasks/client-filter";
import { TASK_STATUSES, TASK_STATUS_META } from "@/lib/tasks/constants";
import { cn } from "@/lib/utils";

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; color: string; emoji: string }
> = {
  high: { label: "High", color: "#dc2626", emoji: "🔴" },
  medium: { label: "Medium", color: "#d97706", emoji: "🟡" },
  low: { label: "Low", color: "#2563eb", emoji: "🔵" },
};

function PriorityOptionLabel({ priority }: { priority: TaskPriority }) {
  const meta = PRIORITY_META[priority];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

function progressBarColor(percent: number) {
  if (percent >= 70) return "bg-emerald-500";
  if (percent >= 40) return "bg-amber-500";
  return "bg-red-500";
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

interface CellContext {
  task: TaskWithMeta;
  onPatch: (patch: Record<string, unknown>) => void;
  onExpand: () => void;
  members: OrgMember[];
  clients: OrgClient[];
}

export function TaskNameCell({ task, onPatch, onExpand }: CellContext) {
  const [value, setValue] = useState(task.name);

  useEffect(() => {
    setValue(task.name);
  }, [task.name]);

  return (
    <div className="group flex min-w-[200px] items-center gap-2">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          const trimmed = value.trim();
          if (trimmed && trimmed !== task.name) {
            onPatch({ name: trimmed });
          } else {
            setValue(task.name);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-8 border-transparent bg-transparent px-1 font-semibold shadow-none focus-visible:border-input focus-visible:bg-background"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={onExpand}
      >
        <ArrowUpRight className="size-4" />
      </Button>
    </div>
  );
}

export function TaskStatusCell({ task, onPatch }: CellContext) {
  const meta = TASK_STATUS_META[task.status as TaskStatus];

  return (
    <Select
      value={task.status}
      onValueChange={(value) => onPatch({ status: value })}
    >
      <SelectTrigger
        className="h-8 w-[140px] border-transparent bg-transparent capitalize shadow-none focus:ring-1"
        style={{ color: meta.color, backgroundColor: meta.bgColor }}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TASK_STATUSES.map((status) => (
          <SelectItem key={status} value={status} className="capitalize">
            {formatStatusLabel(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TaskProgressCell({ task, onPatch }: CellContext) {
  const [open, setOpen] = useState(false);
  const isManual = task.progress_source !== "sub_tasks";
  const percent = task.progress ?? 0;

  return (
    <div className="min-w-[140px]">
      <div className="flex items-center gap-2">
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-all", progressBarColor(percent))}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
          {task.progress_label ?? `${percent}%`}
        </span>
      </div>
      {isManual ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="mt-1 text-[10px] text-primary hover:underline"
            >
              Adjust
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <p className="mb-3 text-xs font-medium">Manual progress</p>
            <Slider
              value={[percent]}
              max={100}
              step={1}
              onValueChange={([value]) => onPatch({ progress: value })}
            />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {percent}%
            </p>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

export function TaskMembersCell({ task, onPatch, members }: CellContext) {
  const selectedIds = new Set(task.member_ids ?? []);
  const selected = members.filter((member) => selectedIds.has(member.id));
  const overflow = selected.length > 4 ? selected.length - 4 : 0;
  const visible = selected.slice(0, 4);

  function toggleMember(memberId: string) {
    const next = new Set(selectedIds);
    if (next.has(memberId)) {
      next.delete(memberId);
    } else {
      next.add(memberId);
    }
    onPatch({ member_ids: Array.from(next) });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="flex items-center -space-x-2">
          {visible.length === 0 ? (
            <span className="text-xs text-muted-foreground">Assign</span>
          ) : (
            visible.map((member) => (
              <Avatar key={member.id} className="size-7 border-2 border-background">
                <AvatarFallback className="text-[10px]">
                  {memberInitials(member)}
                </AvatarFallback>
              </Avatar>
            ))
          )}
          {overflow > 0 ? (
            <span className="ml-2 text-xs text-muted-foreground">+{overflow}</span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
          Members
        </p>
        {members.map((member) => (
          <button
            key={member.id}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
              selectedIds.has(member.id) && "bg-muted",
            )}
            onClick={() => toggleMember(member.id)}
          >
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px]">
                {memberInitials(member)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">
              {member.display_name ?? member.email}
            </span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function TaskClientCell({ task, onPatch, clients }: CellContext) {
  return (
    <Select
      value={task.client_id ?? "none"}
      onValueChange={(value) =>
        onPatch({ client_id: value === "none" ? null : value })
      }
    >
      <SelectTrigger className="h-8 w-[140px] border-transparent bg-transparent shadow-none focus:ring-1">
        <SelectValue placeholder="Client" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No client</SelectItem>
        {clients.map((client) => (
          <SelectItem key={client.id} value={client.id}>
            {client.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TaskDueDateCell({ task, onPatch }: CellContext) {
  const [open, setOpen] = useState(false);
  const dueDate = task.due_date ? parseISO(task.due_date) : undefined;
  const isOverdue =
    dueDate && isBefore(dueDate, startOfDay(new Date())) && task.status !== "completed";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 font-mono text-xs",
            isOverdue ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {task.due_date ? format(dueDate!, "yyyy-MM-dd") : "Set date"}
          {isOverdue ? <AlertTriangle className="size-3.5" /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dueDate}
          onSelect={(date) => {
            onPatch({
              due_date: date ? format(date, "yyyy-MM-dd") : null,
            });
            setOpen(false);
          }}
          initialFocus
        />
        {task.due_date ? (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onPatch({ due_date: null });
                setOpen(false);
              }}
            >
              Clear date
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function TaskPriorityCell({ task, onPatch }: CellContext) {
  const priority = task.priority;

  return (
    <Select
      value={priority ?? "none"}
      onValueChange={(value) =>
        onPatch({
          priority: value === "none" ? null : (value as TaskPriority),
        })
      }
    >
      <SelectTrigger className="h-8 min-w-[7.5rem] w-max border-transparent bg-transparent shadow-none focus:ring-1 [&>span]:line-clamp-none">
        <SelectValue placeholder="Priority">
          {priority ? <PriorityOptionLabel priority={priority} /> : "—"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">—</SelectItem>
        {(Object.keys(PRIORITY_META) as TaskPriority[]).map((key) => (
          <SelectItem key={key} value={key}>
            <PriorityOptionLabel priority={key} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TaskStartDateCell({ task, onPatch }: CellContext) {
  const [open, setOpen] = useState(false);
  const startDate = task.start_date ? parseISO(task.start_date) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          {task.start_date ? format(startDate!, "yyyy-MM-dd") : "Set date"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={startDate}
          onSelect={(date) => {
            onPatch({
              start_date: date ? format(date, "yyyy-MM-dd") : null,
            });
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export function renderTaskCell(
  column: ColumnDefinition | string,
  context: CellContext,
): React.ReactNode {
  const columnDef =
    typeof column === "string"
      ? ({ id: column, label: column } as ColumnDefinition)
      : column;

  if (columnDef.isCustom && columnDef.fieldType) {
    return renderCustomFieldCell({
      task: context.task,
      column: columnDef,
      onPatch: context.onPatch,
      members: context.members,
      onExpand: context.onExpand,
    });
  }

  switch (columnDef.id) {
    case "name":
      return <TaskNameCell {...context} />;
    case "status":
      return <TaskStatusCell {...context} />;
    case "progress":
      return <TaskProgressCell {...context} />;
    case "members":
      return <TaskMembersCell {...context} />;
    case "client_id":
      return <TaskClientCell {...context} />;
    case "due_date":
      return <TaskDueDateCell {...context} />;
    case "priority":
      return <TaskPriorityCell {...context} />;
    case "start_date":
      return <TaskStartDateCell {...context} />;
    default:
      return <span className="text-muted-foreground">—</span>;
  }
}
