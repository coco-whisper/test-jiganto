"use client";

import { Inbox } from "lucide-react";

import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import { TASK_STATUS_META } from "@/lib/tasks/constants";
import type { TaskStatus } from "@/lib/database.types";
import { cn } from "@/lib/utils";

interface TimelineUnscheduledStripProps {
  tasks: TaskWithMeta[];
  onOpenTask: (task: TaskWithMeta) => void;
}

export function TimelineUnscheduledStrip({
  tasks,
  onOpenTask,
}: TimelineUnscheduledStripProps) {
  if (tasks.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-muted-foreground">
        No unscheduled tasks
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 p-3">
      {tasks.map((task) => {
        const meta = TASK_STATUS_META[task.status as TaskStatus];
        return (
          <button
            key={task.id}
            type="button"
            onClick={() => onOpenTask(task)}
            className={cn(
              "max-w-[200px] truncate rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm transition-opacity hover:opacity-90",
            )}
            style={{
              color: meta.color,
              backgroundColor: meta.bgColor,
              borderColor: meta.color,
            }}
          >
            {task.name}
          </button>
        );
      })}
    </div>
  );
}

interface TimelineUnscheduledPanelProps extends TimelineUnscheduledStripProps {
  visible: boolean;
}

export function TimelineUnscheduledPanel({
  tasks,
  onOpenTask,
  visible,
}: TimelineUnscheduledPanelProps) {
  if (!visible) return null;

  return (
    <div className="mt-4 rounded-lg border bg-muted/20">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Inbox className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Unscheduled</h3>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {tasks.length}
        </span>
      </div>
      <TimelineUnscheduledStrip tasks={tasks} onOpenTask={onOpenTask} />
    </div>
  );
}
