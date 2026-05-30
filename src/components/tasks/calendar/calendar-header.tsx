"use client";

import {
  addMonths,
  addWeeks,
  format,
  parseISO,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CalendarConfig, CalendarSubView } from "@/lib/tasks/calendar-config";

interface CalendarHeaderProps {
  config: CalendarConfig;
  onConfigChange: (config: CalendarConfig) => void;
}

export function CalendarHeader({ config, onConfigChange }: CalendarHeaderProps) {
  const focus = parseISO(config.focus_date);
  const title =
    config.sub_view === "month"
      ? format(focus, "MMMM yyyy")
      : `Week of ${format(focus, "MMM d, yyyy")}`;

  function shiftFocus(direction: -1 | 1) {
    const next =
      config.sub_view === "month"
        ? direction === 1
          ? addMonths(focus, 1)
          : subMonths(focus, 1)
        : direction === 1
          ? addWeeks(focus, 1)
          : subWeeks(focus, 1);

    onConfigChange({
      ...config,
      focus_date: format(next, "yyyy-MM-dd"),
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => shiftFocus(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="min-w-[160px] text-center text-sm font-semibold">
          {title}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => shiftFocus(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() =>
            onConfigChange({
              ...config,
              focus_date: format(new Date(), "yyyy-MM-dd"),
            })
          }
        >
          Today
        </Button>
      </div>

      <ToggleGroup
        type="single"
        value={config.sub_view}
        onValueChange={(value) => {
          if (value === "month" || value === "week") {
            onConfigChange({
              ...config,
              sub_view: value as CalendarSubView,
            });
          }
        }}
        className="border rounded-md p-0.5"
      >
        <ToggleGroupItem value="month" className="h-8 px-3 text-xs">
          Month
        </ToggleGroupItem>
        <ToggleGroupItem value="week" className="h-8 px-3 text-xs">
          Week
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
