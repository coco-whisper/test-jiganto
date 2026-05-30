import type { Json } from "@/lib/database.types";

export type TimelineZoom = "week" | "month" | "quarter";

export interface TimelineConfig {
  zoom: TimelineZoom;
  show_unscheduled: boolean;
}

export const DEFAULT_TIMELINE_CONFIG: TimelineConfig = {
  zoom: "month",
  show_unscheduled: true,
};

export function parseTimelineConfig(
  value: Json | null | undefined,
): TimelineConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return DEFAULT_TIMELINE_CONFIG;
  }

  const record = value as Record<string, Json | undefined>;
  const zoom =
    record.zoom === "week" || record.zoom === "quarter"
      ? record.zoom
      : "month";

  return {
    zoom,
    show_unscheduled: record.show_unscheduled !== false,
  };
}
