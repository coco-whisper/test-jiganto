"use client";

import { TaskViewEmptyState } from "@/components/tasks/views/task-view-empty-state";
import type { ViewMode } from "@/lib/database.types";

interface TaskViewPlaceholderProps {
  viewMode: ViewMode;
  taskCount: number;
  onAddTask?: () => void;
}

export function TaskViewPlaceholder({
  viewMode,
  taskCount,
  onAddTask,
}: TaskViewPlaceholderProps) {
  if (taskCount === 0) {
    return (
      <TaskViewEmptyState
        viewMode={viewMode}
        variant="view-specific"
        onAddTask={onAddTask}
      />
    );
  }

  return (
    <TaskViewEmptyState
      viewMode={viewMode}
      variant="view-specific"
      title={`${taskCount} task${taskCount === 1 ? "" : "s"} in list`}
      description="Switch to Table, Kanban, Timeline, or Calendar to work with these tasks."
    />
  );
}
