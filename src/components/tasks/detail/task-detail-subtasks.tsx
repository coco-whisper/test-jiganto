"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrgMember } from "@/hooks/use-org-data";
import { useTaskSubTasks, type SubTask } from "@/hooks/use-task-detail-data";

interface TaskDetailSubtasksProps {
  taskId: string;
  members: OrgMember[];
}

export function TaskDetailSubtasks({ taskId, members }: TaskDetailSubtasksProps) {
  const { data: subTasks = [], isLoading, createSubTask, updateSubTask, deleteSubTask } =
    useTaskSubTasks(taskId);
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;

    setIsAdding(true);
    try {
      await createSubTask.mutateAsync({ name });
      setNewName("");
    } finally {
      setIsAdding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const completed = subTasks.filter((item) => item.is_done).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {completed}/{subTasks.length} completed — updates task progress
      </p>

      <div className="space-y-2">
        {subTasks.map((subTask) => (
          <SubTaskRow
            key={subTask.id}
            subTask={subTask}
            members={members}
            onToggle={(isDone) =>
              updateSubTask.mutate({ id: subTask.id, patch: { is_done: isDone } })
            }
            onRename={(name) =>
              updateSubTask.mutate({ id: subTask.id, patch: { name } })
            }
            onAssignee={(assigneeId) =>
              updateSubTask.mutate({
                id: subTask.id,
                patch: { assignee_id: assigneeId },
              })
            }
            onDelete={() => deleteSubTask.mutate(subTask.id)}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Add sub-task..."
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleAdd();
          }}
        />
        <Button size="sm" onClick={handleAdd} disabled={isAdding}>
          {isAdding ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function SubTaskRow({
  subTask,
  members,
  onToggle,
  onRename,
  onAssignee,
  onDelete,
}: {
  subTask: SubTask;
  members: OrgMember[];
  onToggle: (isDone: boolean) => void;
  onRename: (name: string) => void;
  onAssignee: (assigneeId: string | null) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-2 py-1.5">
      <Checkbox
        checked={subTask.is_done}
        onCheckedChange={(checked) => onToggle(Boolean(checked))}
      />
      <Input
        defaultValue={subTask.name}
        className="h-8 flex-1 border-0 shadow-none focus-visible:ring-0"
        onBlur={(event) => {
          const name = event.target.value.trim();
          if (name && name !== subTask.name) onRename(name);
        }}
      />
      <Select
        value={subTask.assignee_id ?? "none"}
        onValueChange={(value) =>
          onAssignee(value === "none" ? null : value)
        }
      >
        <SelectTrigger className="h-8 w-[120px]">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Unassigned</SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.display_name ?? member.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon" className="size-8" onClick={onDelete}>
        <Trash2 className="size-4 text-muted-foreground" />
      </Button>
    </div>
  );
}
