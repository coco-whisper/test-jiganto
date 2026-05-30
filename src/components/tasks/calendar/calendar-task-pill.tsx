"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import {
  getPriorityDotColor,
  getTaskPillStyle,
} from "@/lib/tasks/calendar";
import { cn } from "@/lib/utils";

interface CalendarTaskPillProps {
  task: TaskWithMeta;
  onOpen: () => void;
  compact?: boolean;
}

export function CalendarTaskPill({
  task,
  onOpen,
  compact = false,
}: CalendarTaskPillProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `calendar-task:${task.id}` });

  const style = getTaskPillStyle(task);
  const priorityColor = getPriorityDotColor(task.priority);

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={{
        ...style,
        transform: CSS.Translate.toString(transform),
        borderWidth: 1,
        borderStyle: "solid",
      }}
      className={cn(
        "flex w-full items-center gap-1 rounded-full px-2 text-left text-[11px] font-medium leading-tight shadow-sm transition-opacity",
        compact ? "py-0.5" : "py-1",
        isDragging && "opacity-40",
      )}
      {...listeners}
      {...attributes}
      onClick={(event) => {
        event.stopPropagation();
        if (!isDragging) onOpen();
      }}
    >
      {task.priority ? (
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: priorityColor }}
        />
      ) : null}
      <span className="truncate">{task.name}</span>
    </button>
  );
}
