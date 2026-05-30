"use client";

import { useDroppable } from "@dnd-kit/core";
import { format, isSameMonth, isToday, parseISO } from "date-fns";

import { CalendarTaskPill } from "@/components/tasks/calendar/calendar-task-pill";
import { groupTasksByDueDate } from "@/lib/tasks/calendar";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import { cn } from "@/lib/utils";

interface CalendarMonthGridProps {
  days: Date[];
  focusDate: string;
  scheduledTasks: TaskWithMeta[];
  onOpenTask: (task: TaskWithMeta) => void;
  onDayClick: (date: string) => void;
}

function MonthDayCell({
  day,
  focusDate,
  tasks,
  onOpenTask,
  onDayClick,
}: {
  day: Date;
  focusDate: string;
  tasks: TaskWithMeta[];
  onOpenTask: (task: TaskWithMeta) => void;
  onDayClick: (date: string) => void;
}) {
  const dateKey = format(day, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({
    id: `calendar-day:${dateKey}`,
  });
  const anchor = parseISO(focusDate);
  const inMonth = isSameMonth(day, anchor);
  const visibleTasks = tasks.slice(0, 3);
  const overflow = tasks.length - visibleTasks.length;

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={() => onDayClick(dateKey)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onDayClick(dateKey);
      }}
      className={cn(
        "flex min-h-[100px] flex-col border-b border-r p-1 text-left transition-colors hover:bg-muted/30",
        !inMonth && "bg-muted/10 text-muted-foreground",
        isOver && "bg-primary/5 ring-1 ring-inset ring-primary/30",
        isToday(day) && "bg-accent/30",
      )}
    >
      <span
        className={cn(
          "mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
          isToday(day) && "bg-primary text-primary-foreground",
        )}
      >
        {format(day, "d")}
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        {visibleTasks.map((task) => (
          <CalendarTaskPill
            key={task.id}
            task={task}
            compact
            onOpen={() => onOpenTask(task)}
          />
        ))}
        {overflow > 0 ? (
          <span className="px-1 text-[10px] text-muted-foreground">
            +{overflow} more
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function CalendarMonthGrid({
  days,
  focusDate,
  scheduledTasks,
  onOpenTask,
  onDayClick,
}: CalendarMonthGridProps) {
  const byDate = groupTasksByDueDate(scheduledTasks);
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="min-w-0 flex-1 rounded-lg border bg-background">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {weekDays.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          return (
            <MonthDayCell
              key={key}
              day={day}
              focusDate={focusDate}
              tasks={byDate.get(key) ?? []}
              onOpenTask={onOpenTask}
              onDayClick={onDayClick}
            />
          );
        })}
      </div>
    </div>
  );
}
