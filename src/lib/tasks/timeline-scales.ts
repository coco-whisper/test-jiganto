import type { GanttConfig } from "@dhtmlx/trial-react-gantt";

import type { TimelineZoom } from "@/lib/tasks/timeline-config";

export function getTimelineScales(zoom: TimelineZoom): GanttConfig["scales"] {
  switch (zoom) {
    case "week":
      return [
        { unit: "month", step: 1, date: "%F %Y" },
        { unit: "day", step: 1, date: "%j" },
      ];
    case "quarter":
      return [
        { unit: "year", step: 1, date: "%Y" },
        { unit: "month", step: 1, date: "%F" },
      ];
    default:
      return [
        { unit: "month", step: 1, date: "%F %Y" },
        { unit: "week", step: 1, date: "W%W" },
      ];
  }
}

export function buildTimelineGanttConfig(zoom: TimelineZoom): GanttConfig {
  return {
    date_format: "%Y-%m-%d",
    scales: getTimelineScales(zoom),
    scale_height: 50,
    row_height: 36,
    bar_height: 26,
    grid_width: 280,
    readonly: false,
    show_links: false,
    drag_links: false,
    drag_move: true,
    drag_resize: true,
    drag_progress: false,
    show_quick_info: false,
    details_on_dblclick: false,
    open_tree_initially: true,
    fit_tasks: true,
    columns: [
      { name: "text", label: "Task", width: 180, tree: true },
      { name: "start_date", label: "Start", align: "center", width: 88 },
      { name: "end_date", label: "Due", align: "center", width: 88 },
    ],
  };
}
