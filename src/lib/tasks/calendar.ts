import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import type { TaskPriority, TaskStatus } from "@/lib/database.types";
import { TASK_STATUS_META } from "@/lib/tasks/constants";

export const CALENDAR_DUE_TIME_KEY = "calendar_due_time";

export const WEEK_SLOT_START_HOUR = 6;
export const WEEK_SLOT_END_HOUR = 22;

export function getCalendarDueTime(task: TaskWithMeta): string | null {
  const data = task.custom_data;
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return null;
  }
  const raw = (data as Record<string, unknown>)[CALENDAR_DUE_TIME_KEY];
  if (typeof raw === "string" && /^\d{1,2}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(":");
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  }
  return null;
}

export function getTaskPillStyle(task: TaskWithMeta) {
  const meta = TASK_STATUS_META[task.status as TaskStatus];
  return {
    backgroundColor: meta?.bgColor ?? "#f1f5f9",
    color: meta?.color ?? "#334155",
    borderColor: meta?.color ?? "#94a3b8",
  };
}

export function getPriorityDotColor(priority: TaskPriority | null) {
  if (priority === "high") return "#dc2626";
  if (priority === "medium") return "#d97706";
  if (priority === "low") return "#2563eb";
  return "transparent";
}

export function partitionCalendarTasks(tasks: TaskWithMeta[]) {
  const scheduled: TaskWithMeta[] = [];
  const unscheduled: TaskWithMeta[] = [];

  for (const task of tasks) {
    if (task.due_date) scheduled.push(task);
    else unscheduled.push(task);
  }

  return { scheduled, unscheduled };
}

export function groupTasksByDueDate(tasks: TaskWithMeta[]) {
  const map = new Map<string, TaskWithMeta[]>();

  for (const task of tasks) {
    if (!task.due_date) continue;
    const key = task.due_date.slice(0, 10);
    const list = map.get(key) ?? [];
    list.push(task);
    map.set(key, list);
  }

  return map;
}

export function getMonthGridDays(focusDate: string) {
  const anchor = parseISO(focusDate);
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function getWeekDays(focusDate: string) {
  const anchor = parseISO(focusDate);
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function getWeekHourSlots() {
  const slots: number[] = [];
  for (let hour = WEEK_SLOT_START_HOUR; hour <= WEEK_SLOT_END_HOUR; hour += 1) {
    slots.push(hour);
  }
  return slots;
}

export function buildSchedulePatch(
  dueDate: string | null,
  dueTime: string | null,
  existingCustomData: TaskWithMeta["custom_data"],
): Record<string, unknown> {
  const base =
    typeof existingCustomData === "object" &&
    existingCustomData !== null &&
    !Array.isArray(existingCustomData)
      ? { ...(existingCustomData as Record<string, unknown>) }
      : {};

  if (dueDate === null) {
    const next = { ...base };
    delete next[CALENDAR_DUE_TIME_KEY];
    return { due_date: null, custom_data: next };
  }

  const next = { ...base };
  if (dueTime) {
    next[CALENDAR_DUE_TIME_KEY] = dueTime;
  } else {
    delete next[CALENDAR_DUE_TIME_KEY];
  }

  return { due_date: dueDate, custom_data: next };
}

export function parseCalendarDropTarget(overId: string | number) {
  const id = String(overId);

  if (id === "calendar-unscheduled") {
    return { type: "unscheduled" as const };
  }

  if (id.startsWith("calendar-day:")) {
    return { type: "day" as const, date: id.replace("calendar-day:", "") };
  }

  if (id.startsWith("calendar-slot:")) {
    const parts = id.replace("calendar-slot:", "").split(":");
    const date = parts[0];
    const hour = parseInt(parts[1] ?? "", 10);
    if (!date || Number.isNaN(hour)) return null;
    return {
      type: "slot" as const,
      date,
      time: `${String(hour).padStart(2, "0")}:00`,
    };
  }

  return null;
}

export function formatHourLabel(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export function formatDropDateLabel(date: string) {
  return format(parseISO(date), "MMM d, yyyy");
}
