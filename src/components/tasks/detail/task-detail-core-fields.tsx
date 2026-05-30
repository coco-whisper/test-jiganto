"use client";

import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { AlertTriangle } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { OrgClient, OrgMember } from "@/hooks/use-org-data";
import { CustomFieldPanelEditor } from "@/components/tasks/table/custom-field-cells";
import type { CustomColumn } from "@/hooks/use-task-detail-data";
import { customColumnToDefinition } from "@/lib/custom-columns/types";
import type { TaskPriority, TaskStatus } from "@/lib/database.types";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import { TASK_STATUSES, TASK_STATUS_META } from "@/lib/tasks/constants";
interface TaskDetailCoreFieldsProps {
  task: TaskWithMeta;
  members: OrgMember[];
  clients: OrgClient[];
  customColumns: CustomColumn[];
  onPatch: (patch: Record<string, unknown>) => void;
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

export function TaskDetailCoreFields({
  task,
  members,
  clients,
  customColumns,
  onPatch,
}: TaskDetailCoreFieldsProps) {
  const selectedMemberIds = new Set(task.member_ids ?? []);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Task name</Label>
        <Input
          defaultValue={task.name}
          onBlur={(event) => {
            const value = event.target.value.trim();
            if (value && value !== task.name) onPatch({ name: value });
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={task.status}
            onValueChange={(value) => onPatch({ status: value as TaskStatus })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  {TASK_STATUS_META[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={task.priority ?? "none"}
            onValueChange={(value) =>
              onPatch({
                priority: value === "none" ? null : (value as TaskPriority),
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Due date</Label>
          <DatePickerField
            value={task.due_date}
            onChange={(date) => onPatch({ due_date: date })}
            showOverdue={
              task.due_date
                ? isBefore(parseISO(task.due_date), startOfDay(new Date())) &&
                  task.status !== "completed"
                : false
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Start date</Label>
          <DatePickerField
            value={task.start_date}
            onChange={(date) => onPatch({ start_date: date })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Client</Label>
        <Select
          value={task.client_id ?? "none"}
          onValueChange={(value) =>
            onPatch({ client_id: value === "none" ? null : value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select client" />
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
      </div>

      <div className="space-y-2">
        <Label>Members</Label>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => {
            const selected = selectedMemberIds.has(member.id);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  const next = new Set(selectedMemberIds);
                  if (selected) next.delete(member.id);
                  else next.add(member.id);
                  onPatch({ member_ids: Array.from(next) });
                }}
                className={`flex items-center gap-2 rounded-full border px-2 py-1 text-xs ${
                  selected ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <Avatar className="size-5">
                  <AvatarFallback className="text-[9px]">
                    {memberInitials(member)}
                  </AvatarFallback>
                </Avatar>
                {member.display_name ?? member.email.split("@")[0]}
              </button>
            );
          })}
        </div>
      </div>

      {task.progress_source !== "sub_tasks" ? (
        <div className="space-y-2">
          <Label>Progress ({task.progress}%)</Label>
          <Slider
            value={[task.progress]}
            max={100}
            step={1}
            onValueCommit={([value]) => onPatch({ progress: value })}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Progress: {task.progress_label ?? `${task.progress}%`} (from
          sub-tasks)
        </p>
      )}

      {customColumns.length > 0 ? (
        <div className="space-y-4 border-t pt-4">
          <Label className="text-muted-foreground">Custom fields</Label>
          {customColumns.map((column) => (
            <CustomFieldPanelEditor
              key={column.id}
              task={task}
              column={customColumnToDefinition(column)}
              onPatch={onPatch}
              members={members}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DatePickerField({
  value,
  onChange,
  showOverdue,
}: {
  value: string | null;
  onChange: (date: string | null) => void;
  showOverdue?: boolean;
}) {
  const date = value ? parseISO(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm ${
            showOverdue ? "border-destructive text-destructive" : ""
          }`}
        >
          {value ? format(date!, "MMM d, yyyy") : "Pick date"}
          {showOverdue ? <AlertTriangle className="size-4" /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selected) =>
            onChange(selected ? format(selected, "yyyy-MM-dd") : null)
          }
        />
      </PopoverContent>
    </Popover>
  );
}
