"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus, Settings2 } from "lucide-react";
import { useState } from "react";

import { KanbanCard } from "@/components/tasks/kanban/kanban-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { OrgMember } from "@/hooks/use-org-data";
import {
  getKanbanColumnLabel,
  getKanbanColumnStyle,
} from "@/lib/tasks/kanban";
import type { TableGroup } from "@/lib/tasks/table-groups";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  column: TableGroup;
  groupBy: string | null;
  members: OrgMember[];
  wipLimit?: number;
  onWipLimitChange: (limit: number | null) => void;
  onOpenTask: (task: TaskWithMeta) => void;
  onCreateTask: (name: string) => Promise<void>;
  isCreating?: boolean;
}

export function KanbanColumn({
  column,
  groupBy,
  members,
  wipLimit,
  onWipLimitChange,
  onOpenTask,
  onCreateTask,
  isCreating,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${column.key}` });
  const [isAdding, setIsAdding] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [wipDraft, setWipDraft] = useState(
    wipLimit != null ? String(wipLimit) : "",
  );

  const style = getKanbanColumnStyle(groupBy, column.key);
  const label = getKanbanColumnLabel(groupBy, column.key, column.label);
  const atWipLimit =
    wipLimit != null && wipLimit > 0 && column.tasks.length >= wipLimit;

  async function handleAdd() {
    const name = draftName.trim();
    if (!name) {
      setIsAdding(false);
      return;
    }
    await onCreateTask(name);
    setDraftName("");
    setIsAdding(false);
  }

  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col rounded-lg border bg-muted/20 md:w-[280px] shadow-md hover:shadow-lg hover:border-primary/40 transition-all duration-300",
        isOver && "ring-2 ring-primary/40",
        atWipLimit && "border-amber-300/60",
      )}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <span
          className="truncate rounded-full px-2 py-0.5 text-xs font-semibold capitalize"
          style={
            style.color
              ? { color: style.color, backgroundColor: style.bgColor }
              : undefined
          }
        >
          {label}
        </span>
        <Badge variant="secondary" className="tabular-nums">
          {column.tasks.length}
          {wipLimit ? ` / ${wipLimit}` : ""}
        </Badge>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto size-7 shrink-0"
              title="WIP limit"
            >
              <Settings2 className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-3" align="end">
            <Label className="text-xs">WIP limit (optional)</Label>
            <Input
              type="number"
              min={1}
              className="mt-1 h-8"
              placeholder="No limit"
              value={wipDraft}
              onChange={(event) => setWipDraft(event.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  const parsed = parseInt(wipDraft, 10);
                  onWipLimitChange(
                    Number.isNaN(parsed) || parsed < 1 ? null : parsed,
                  );
                }}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setWipDraft("");
                  onWipLimitChange(null);
                }}
              >
                Clear
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div
        ref={setNodeRef}
        className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2"
      >
        {column.tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            members={members}
            onOpen={() => onOpenTask(task)}
          />
        ))}
      </div>

      <div className="border-t p-2">
        {isAdding ? (
          <div className="space-y-2">
            <Input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Task name..."
              className="h-8"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleAdd();
                if (event.key === "Escape") {
                  setIsAdding(false);
                  setDraftName("");
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => void handleAdd()}
                disabled={isCreating}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setDraftName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full gap-1 text-muted-foreground"
            onClick={() => setIsAdding(true)}
            disabled={atWipLimit}
            title={atWipLimit ? "WIP limit reached" : undefined}
          >
            <Plus className="size-3.5" />
            Add card
          </Button>
        )}
      </div>
    </div>
  );
}
