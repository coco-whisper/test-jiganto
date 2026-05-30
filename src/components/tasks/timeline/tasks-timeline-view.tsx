"use client";

import { useMemo, useState } from "react";

import { TaskDetailPanel } from "@/components/tasks/detail/task-detail-panel";
import { TimelineBoard } from "@/components/tasks/timeline/timeline-board";
import { useOrgClients, useOrgMembers } from "@/hooks/use-org-data";
import type { TimelineConfig } from "@/lib/tasks/timeline-config";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";

interface TasksTimelineViewProps {
  tasks: TaskWithMeta[];
  timelineConfig: TimelineConfig;
  onTimelineConfigChange: (config: TimelineConfig) => void;
  updateTask: (input: {
    id: string;
    patch: Record<string, unknown>;
  }) => Promise<TaskWithMeta>;
  currentUserId?: string;
}

export function TasksTimelineView({
  tasks,
  timelineConfig,
  onTimelineConfigChange,
  updateTask,
  currentUserId,
}: TasksTimelineViewProps) {
  const { data: members = [] } = useOrgMembers();
  const { data: clients = [] } = useOrgClients();
  const [detailTask, setDetailTask] = useState<TaskWithMeta | null>(null);

  const detailTaskId = detailTask?.id ?? null;

  const syncedDetailTask = useMemo(() => {
    if (!detailTaskId) return null;
    return tasks.find((task) => task.id === detailTaskId) ?? detailTask;
  }, [tasks, detailTaskId, detailTask]);

  return (
    <>
      <TimelineBoard
        tasks={tasks}
        timelineConfig={timelineConfig}
        onTimelineConfigChange={onTimelineConfigChange}
        onOpenTask={setDetailTask}
        onUpdateDates={(taskId, patch) => {
          void updateTask({ id: taskId, patch });
        }}
      />

      <TaskDetailPanel
        task={syncedDetailTask}
        open={syncedDetailTask !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTask(null);
        }}
        members={members}
        clients={clients}
        currentUserId={currentUserId}
        onTaskUpdated={setDetailTask}
      />
    </>
  );
}
