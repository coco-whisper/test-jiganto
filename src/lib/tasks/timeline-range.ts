import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  isBefore,
  max,
  min,
  startOfDay,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";

import type { TimelineBar } from "@/lib/tasks/timeline-data";
import type { TimelineZoom } from "@/lib/tasks/timeline-config";

export interface TimelineScaleCell {
  key: string;
  start: Date;
  end: Date;
  label: string;
  widthPx: number;
}

export interface TimelineViewport {
  rangeStart: Date;
  rangeEnd: Date;
  pixelsPerDay: number;
  totalWidthPx: number;
  primaryRow: TimelineScaleCell[];
  secondaryRow: TimelineScaleCell[];
}

const PIXELS_PER_DAY: Record<TimelineZoom, number> = {
  week: 28,
  month: 10,
  quarter: 3,
};

const GRID_LABEL_WIDTH = 280;
const SCALE_ROW_HEIGHT = 25;

export { GRID_LABEL_WIDTH, SCALE_ROW_HEIGHT, PIXELS_PER_DAY };

function daysInclusive(start: Date, end: Date): number {
  return differenceInCalendarDays(end, start) + 1;
}

function widthForSpan(
  spanStart: Date,
  spanEnd: Date,
  pixelsPerDay: number,
): number {
  return Math.max(pixelsPerDay, daysInclusive(spanStart, spanEnd) * pixelsPerDay);
}

export function computeTimelineViewport(
  bars: TimelineBar[],
  zoom: TimelineZoom,
): TimelineViewport {
  const pixelsPerDay = PIXELS_PER_DAY[zoom];
  const today = startOfDay(new Date());

  let rangeStart: Date;
  let rangeEnd: Date;

  if (bars.length === 0) {
    rangeStart = subMonths(today, 1);
    rangeEnd = addMonths(today, 2);
  } else {
    const starts = bars.map((b) => b.start);
    const ends = bars.map((b) => b.end);
    const dataStart = min(starts);
    const dataEnd = max(ends);

    const padDays =
      zoom === "week" ? 7 : zoom === "quarter" ? 45 : 14;
    rangeStart = subDays(dataStart, padDays);
    rangeEnd = addDays(dataEnd, padDays);

    if (isBefore(rangeEnd, rangeStart)) {
      rangeEnd = addDays(rangeStart, 30);
    }
  }

  rangeStart = startOfDay(rangeStart);
  rangeEnd = startOfDay(rangeEnd);

  const totalDays = daysInclusive(rangeStart, rangeEnd);
  const totalWidthPx = totalDays * pixelsPerDay;

  const { primaryRow, secondaryRow } = buildScaleRows(
    rangeStart,
    rangeEnd,
    zoom,
    pixelsPerDay,
  );

  return {
    rangeStart,
    rangeEnd,
    pixelsPerDay,
    totalWidthPx,
    primaryRow,
    secondaryRow,
  };
}

function buildScaleRows(
  rangeStart: Date,
  rangeEnd: Date,
  zoom: TimelineZoom,
  pixelsPerDay: number,
): { primaryRow: TimelineScaleCell[]; secondaryRow: TimelineScaleCell[] } {
  if (zoom === "week") {
    const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
    const primaryRow = months.map((monthStart) => {
      const monthEnd = min([endOfMonth(monthStart), rangeEnd]);
      const cellStart = max([monthStart, rangeStart]);
      return {
        key: format(cellStart, "yyyy-MM"),
        start: cellStart,
        end: monthEnd,
        label: format(cellStart, "MMMM yyyy"),
        widthPx: widthForSpan(cellStart, monthEnd, pixelsPerDay),
      };
    });

    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    const secondaryRow = days.map((day) => ({
      key: format(day, "yyyy-MM-dd"),
      start: day,
      end: day,
      label: format(day, "d"),
      widthPx: pixelsPerDay,
    }));

    return { primaryRow, secondaryRow };
  }

  if (zoom === "quarter") {
    const years: Date[] = [];
    let cursor = startOfYear(rangeStart);
    while (!isBefore(rangeEnd, cursor)) {
      years.push(cursor);
      cursor = addMonths(cursor, 12);
    }

    const primaryRow = years.map((yearStart) => {
      const cellStart = max([yearStart, rangeStart]);
      const cellEnd = min([addDays(yearStart, 364), rangeEnd]);
      return {
        key: format(cellStart, "yyyy"),
        start: cellStart,
        end: cellEnd,
        label: format(cellStart, "yyyy"),
        widthPx: widthForSpan(cellStart, cellEnd, pixelsPerDay),
      };
    });

    const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
    const secondaryRow = months.map((monthStart) => {
      const monthEnd = min([endOfMonth(monthStart), rangeEnd]);
      const cellStart = max([monthStart, rangeStart]);
      return {
        key: format(cellStart, "yyyy-MM"),
        start: cellStart,
        end: monthEnd,
        label: format(cellStart, "MMM"),
        widthPx: widthForSpan(cellStart, monthEnd, pixelsPerDay),
      };
    });

    return { primaryRow, secondaryRow };
  }

  // month zoom: months + weeks
  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
  const primaryRow = months.map((monthStart) => {
    const monthEnd = min([endOfMonth(monthStart), rangeEnd]);
    const cellStart = max([monthStart, rangeStart]);
    return {
      key: format(cellStart, "yyyy-MM"),
      start: cellStart,
      end: monthEnd,
      label: format(cellStart, "MMMM yyyy"),
      widthPx: widthForSpan(cellStart, monthEnd, pixelsPerDay),
    };
  });

  const weeks = eachWeekOfInterval(
    { start: rangeStart, end: rangeEnd },
    { weekStartsOn: 1 },
  );
  const secondaryRow = weeks.map((weekStart) => {
    const weekEnd = min([
      endOfWeek(weekStart, { weekStartsOn: 1 }),
      rangeEnd,
    ]);
    const cellStart = max([weekStart, rangeStart]);
    return {
      key: format(cellStart, "yyyy-'W'II"),
      start: cellStart,
      end: weekEnd,
      label: `W${getISOWeek(cellStart)}`,
      widthPx: widthForSpan(cellStart, weekEnd, pixelsPerDay),
    };
  });

  return { primaryRow, secondaryRow };
}

export function barGeometry(
  bar: TimelineBar,
  viewport: TimelineViewport,
): { leftPx: number; widthPx: number } {
  const { rangeStart, pixelsPerDay } = viewport;
  const offsetDays = differenceInCalendarDays(bar.start, rangeStart);
  const durationDays = Math.max(
    1,
    differenceInCalendarDays(bar.end, bar.start) + 1,
  );

  return {
    leftPx: offsetDays * pixelsPerDay,
    widthPx: durationDays * pixelsPerDay,
  };
}

export function todayMarkerOffset(viewport: TimelineViewport): number | null {
  const today = startOfDay(new Date());
  const { rangeStart, rangeEnd, pixelsPerDay } = viewport;

  if (isBefore(today, rangeStart) || isBefore(rangeEnd, today)) {
    return null;
  }

  return differenceInCalendarDays(today, rangeStart) * pixelsPerDay;
}

export function dateAtPixel(
  viewport: TimelineViewport,
  pixelX: number,
): Date {
  const dayIndex = Math.round(pixelX / viewport.pixelsPerDay);
  return addDays(viewport.rangeStart, Math.max(0, dayIndex));
}

export function pixelForDate(viewport: TimelineViewport, date: Date): number {
  return (
    differenceInCalendarDays(startOfDay(date), viewport.rangeStart) *
    viewport.pixelsPerDay
  );
}

export function snapBarSpan(
  start: Date,
  end: Date,
): { start: Date; end: Date } {
  const s = startOfDay(start);
  let e = startOfDay(end);
  if (isBefore(e, s)) {
    e = s;
  }
  return { start: s, end: e };
}

export function shiftSpanByDays(
  start: Date,
  end: Date,
  deltaDays: number,
): { start: Date; end: Date } {
  return {
    start: addDays(start, deltaDays),
    end: addDays(end, deltaDays),
  };
}

export function formatTimelineDate(date: Date): string {
  return format(date, "d MMM yyyy");
}
