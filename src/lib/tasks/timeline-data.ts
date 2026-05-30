import { addDays, isBefore, parseISO, startOfDay } from "date-fns";
import type { Task } from "@dhtmlx/trial-react-gantt";

import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import type { TaskStatus } from "@/lib/database.types";
import { TASK_STATUS_META } from "@/lib/tasks/constants";

export function partitionTimelineTasks(tasks: TaskWithMeta[]) {
  const scheduled: TaskWithMeta[] = [];
  const unscheduled: TaskWithMeta[] = [];

  for (const task of tasks) {
    if (task.start_date || task.due_date) {
      scheduled.push(task);
    } else {
      unscheduled.push(task);
    }
  }

  return { scheduled, unscheduled };
}

function resolveSpan(task: TaskWithMeta): { start: Date; end: Date } | null {
  const startRaw = task.start_date;
  const dueRaw = task.due_date;

  if (!startRaw && !dueRaw) return null;

  if (startRaw && dueRaw) {
    const start = parseISO(startRaw);
    let end = parseISO(dueRaw);
    if (isBefore(end, start)) {
      end = start;
    }
    return { start: startOfDay(start), end: startOfDay(end) };
  }

  if (dueRaw) {
    const day = startOfDay(parseISO(dueRaw));
    return { start: day, end: day };
  }

  const start = startOfDay(parseISO(startRaw!));
  return { start, end: addDays(start, 1) };
}

export function toGanttTask(task: TaskWithMeta): Task | null {
  const span = resolveSpan(task);
  if (!span) return null;

  const meta = TASK_STATUS_META[task.status as TaskStatus];

  return {
    id: task.id,
    text: task.name,
    start_date: span.start,
    end_date: span.end,
    progress: Math.min(1, Math.max(0, (task.progress ?? 0) / 100)),
    color: meta?.color ?? "#6366f1",
  };
}

export function toGanttTasks(tasks: TaskWithMeta[]): Task[] {
  return tasks
    .map((task) => toGanttTask(task))
    .filter((task): task is Task => task !== null);
}

export function ganttDatesToPatch(
  startDate: Date | undefined,
  endDate: Date | undefined,
): { start_date: string | null; due_date: string | null } {
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  return {
    start_date: startDate ? formatDate(startOfDay(startDate)) : null,
    due_date: endDate ? formatDate(startOfDay(endDate)) : null,
  };
}
