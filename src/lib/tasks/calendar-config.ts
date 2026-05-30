import { format } from "date-fns";

import type { Json } from "@/lib/database.types";

export type CalendarSubView = "month" | "week";

export interface CalendarConfig {
  sub_view: CalendarSubView;
  /** yyyy-MM-dd anchor for visible month/week */
  focus_date: string;
}

export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  sub_view: "month",
  focus_date: format(new Date(), "yyyy-MM-dd"),
};

export function parseCalendarConfig(value: Json | null | undefined): CalendarConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return DEFAULT_CALENDAR_CONFIG;
  }

  const record = value as Record<string, Json | undefined>;
  const sub_view = record.sub_view === "week" ? "week" : "month";
  const focus =
    typeof record.focus_date === "string" && record.focus_date.length >= 10
      ? record.focus_date.slice(0, 10)
      : DEFAULT_CALENDAR_CONFIG.focus_date;

  return { sub_view, focus_date: focus };
}
