"use client";

import { Calendar, Columns3, GanttChart, Kanban, LayoutGrid, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ViewMode } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export type TaskEmptyVariant = "no-tasks" | "filtered" | "view-specific";

interface TaskViewEmptyStateProps {
  variant: TaskEmptyVariant;
  viewMode?: ViewMode;
  title?: string;
  description?: string;
  hint?: string;
  onAddTask?: () => void;
  onClearFilters?: () => void;
  className?: string;
}

const VIEW_META: Record<
  ViewMode,
  { icon: typeof Columns3; label: string; tip: string }
> = {
  table: {
    icon: Columns3,
    label: "Table",
    tip: "Group by status, drag rows to reorder, and press N to add a task.",
  },
  kanban: {
    icon: Kanban,
    label: "Kanban",
    tip: "Drag cards between columns to update status or grouping.",
  },
  timeline: {
    icon: GanttChart,
    label: "Timeline",
    tip: "Add start and due dates to see tasks on the timeline.",
  },
  calendar: {
    icon: Calendar,
    label: "Calendar",
    tip: "Set due dates to schedule tasks on the calendar.",
  },
  board: {
    icon: LayoutGrid,
    label: "Board",
    tip: "Board view is coming soon — try Table or Kanban for now.",
  },
};

export function TaskViewEmptyState({
  variant,
  viewMode = "table",
  title,
  description,
  hint,
  onAddTask,
  onClearFilters,
  className,
}: TaskViewEmptyStateProps) {
  const meta = VIEW_META[viewMode];
  const Icon = variant === "filtered" ? Search : meta.icon;

  const defaultTitle =
    variant === "filtered"
      ? "No tasks match this view"
      : variant === "view-specific" && viewMode === "timeline"
        ? "No scheduled tasks"
        : variant === "view-specific" && viewMode === "calendar"
          ? "No dated tasks on the calendar"
          : "No tasks yet";

  const defaultDescription =
    variant === "filtered"
      ? "Try clearing search or filters to see more tasks."
      : meta.tip;

  return (
    <div
      className={cn(
        "flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium">{title ?? defaultTitle}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {description ?? defaultDescription}
      </p>
      {hint ? (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {variant === "filtered" && onClearFilters ? (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : null}
        {variant !== "filtered" && onAddTask && viewMode !== "board" ? (
          <Button size="lg" className="group gap-2 bg-emerald-700 hover:bg-emerald-800 border-0 shadow-md hover:shadow-lg transition-all duration-300" onClick={onAddTask}>
            <Plus className="size-4 group-hover:rotate-90 transition-transform" />
            Add task
          </Button>
        ) : null}
      </div>
    </div>
  );
}
