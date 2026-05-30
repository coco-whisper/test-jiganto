"use client";

import { useDroppable } from "@dnd-kit/core";
import { format, isToday } from "date-fns";

import { CalendarTaskPill } from "@/components/tasks/calendar/calendar-task-pill";
import {
  formatHourLabel,
  getCalendarDueTime,
  getWeekHourSlots,
  groupTasksByDueDate,
} from "@/lib/tasks/calendar";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import { cn } from "@/lib/utils";

interface CalendarWeekGridProps {
  weekDays: Date[];
  scheduledTasks: TaskWithMeta[];
  onOpenTask: (task: TaskWithMeta) => void;
  onDayClick: (date: string) => void;
  onSlotClick?: (date: string, time: string) => void;
}

function WeekDayHeader({
  day,
  onDayClick,
}: {
  day: Date;
  onDayClick: (date: string) => void;
  onSlotClick?: (date: string, time: string) => void;
}) {
  const dateKey = format(day, "yyyy-MM-dd");

  return (
    <button
      type="button"
      onClick={() => onDayClick(dateKey)}
      className={cn(
        "border-b border-r px-2 py-2 text-center text-xs hover:bg-muted/30",
        isToday(day) && "bg-accent/40 font-semibold",
      )}
    >
      <div className="text-muted-foreground">{format(day, "EEE")}</div>
      <div className="text-sm">{format(day, "d")}</div>
    </button>
  );
}

function TimeSlotCell({
  day,
  hour,
  tasks,
  onOpenTask,
  onSlotClick,
}: {
  day: Date;
  hour: number;
  tasks: TaskWithMeta[];
  onOpenTask: (task: TaskWithMeta) => void;
  onSlotClick?: (date: string, time: string) => void;
}) {
  const dateKey = format(day, "yyyy-MM-dd");
  const time = `${String(hour).padStart(2, "0")}:00`;
  const { setNodeRef, isOver } = useDroppable({
    id: `calendar-slot:${dateKey}:${hour}`,
  });

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={() => onSlotClick?.(dateKey, time)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSlotClick?.(dateKey, time);
      }}
      className={cn(
        "relative min-h-[44px] cursor-pointer border-b border-r p-0.5 hover:bg-muted/20",
        isOver && "bg-primary/10",
      )}
    >
      {tasks.map((task) => (
        <CalendarTaskPill
          key={task.id}
          task={task}
          compact
          onOpen={() => onOpenTask(task)}
        />
      ))}
    </div>
  );
}

function AllDayRow({
  day,
  tasks,
  onOpenTask,
  onDayClick,
}: {
  day: Date;
  tasks: TaskWithMeta[];
  onOpenTask: (task: TaskWithMeta) => void;
  onDayClick: (date: string) => void;
  onSlotClick?: (date: string, time: string) => void;
}) {
  const dateKey = format(day, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({
    id: `calendar-day:${dateKey}`,
  });

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
        "min-h-[36px] border-b border-r p-1 hover:bg-muted/20",
        isOver && "bg-primary/5",
      )}
    >
      <div className="flex flex-col gap-0.5">
        {tasks.map((task) => (
          <CalendarTaskPill
            key={task.id}
            task={task}
            compact
            onOpen={() => onOpenTask(task)}
          />
        ))}
      </div>
    </div>
  );
}

export function CalendarWeekGrid({
  weekDays,
  scheduledTasks,
  onOpenTask,
  onDayClick,
  onSlotClick,
}: CalendarWeekGridProps) {
  const hours = getWeekHourSlots();
  const byDate = groupTasksByDueDate(scheduledTasks);

  function tasksForSlot(dateKey: string, hour: number) {
    const dayTasks = byDate.get(dateKey) ?? [];
    return dayTasks.filter((task) => {
      const time = getCalendarDueTime(task);
      if (!time) return false;
      const taskHour = parseInt(time.split(":")[0] ?? "", 10);
      return taskHour === hour;
    });
  }

  function allDayTasks(dateKey: string) {
    return (byDate.get(dateKey) ?? []).filter(
      (task) => !getCalendarDueTime(task),
    );
  }

  return (
    <div className="min-w-0 flex-1 overflow-auto rounded-lg border bg-background">
      <div
        className="grid min-w-[700px]"
        style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}
      >
        <div className="border-b bg-muted/30" />
        {weekDays.map((day) => (
          <WeekDayHeader key={day.toISOString()} day={day} onDayClick={onDayClick} />
        ))}

        <div className="border-b bg-muted/20 px-1 py-1 text-[10px] text-muted-foreground">
          All day
        </div>
        {weekDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          return (
            <AllDayRow
              key={`allday-${key}`}
              day={day}
              tasks={allDayTasks(key)}
              onOpenTask={onOpenTask}
              onDayClick={onDayClick}
            />
          );
        })}

        {hours.map((hour) => (
          <div key={hour} className="contents">
            <div className="border-b border-r bg-muted/10 px-1 py-2 text-[10px] text-muted-foreground">
              {formatHourLabel(hour)}
            </div>
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              return (
                <TimeSlotCell
                  key={`${key}-${hour}`}
                  day={day}
                  hour={hour}
                  tasks={tasksForSlot(key, hour)}
                  onOpenTask={onOpenTask}
                  onSlotClick={onSlotClick}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
