import { addDays, isBefore, parseISO, startOfDay } from "date-fns";

import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import type { TaskStatus } from "@/lib/database.types";
import { TASK_STATUS_META } from "@/lib/tasks/constants";

export interface TimelineBar {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  color: string;
}

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

export function resolveTaskSpan(
  task: TaskWithMeta,
): { start: Date; end: Date } | null {
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

export function toTimelineBar(task: TaskWithMeta): TimelineBar | null {
  const span = resolveTaskSpan(task);
  if (!span) return null;

  const meta = TASK_STATUS_META[task.status as TaskStatus];

  return {
    id: task.id,
    name: task.name,
    start: span.start,
    end: span.end,
    progress: Math.min(100, Math.max(0, task.progress ?? 0)),
    color: meta?.color ?? "#6366f1",
  };
}

export function toTimelineBars(tasks: TaskWithMeta[]): TimelineBar[] {
  return tasks
    .map((task) => toTimelineBar(task))
    .filter((bar): bar is TimelineBar => bar !== null);
}

export function timelineDatesToPatch(
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
