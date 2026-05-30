"use client";

import { useDroppable } from "@dnd-kit/core";
import { Inbox } from "lucide-react";

import { CalendarTaskPill } from "@/components/tasks/calendar/calendar-task-pill";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import { cn } from "@/lib/utils";

interface CalendarUnscheduledProps {
  tasks: TaskWithMeta[];
  onOpenTask: (task: TaskWithMeta) => void;
}

export function CalendarUnscheduled({
  tasks,
  onOpenTask,
}: CalendarUnscheduledProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "calendar-unscheduled" });

  return (
    <aside
      ref={setNodeRef}
      className={cn(
        "flex w-[220px] shrink-0 flex-col rounded-lg border bg-muted/20",
        isOver && "ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <Inbox className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Unscheduled</h3>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {tasks.length}
        </span>
      </div>
      <div className="flex max-h-[calc(100vh-280px)] flex-col gap-1.5 overflow-y-auto p-2">
        {tasks.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-muted-foreground">
            No unscheduled tasks
          </p>
        ) : (
          tasks.map((task) => (
            <CalendarTaskPill
              key={task.id}
              task={task}
              onOpen={() => onOpenTask(task)}
            />
          ))
        )}
      </div>
      <p className="border-t px-3 py-2 text-[10px] text-muted-foreground">
        Drop here to remove due date
      </p>
    </aside>
  );
}
