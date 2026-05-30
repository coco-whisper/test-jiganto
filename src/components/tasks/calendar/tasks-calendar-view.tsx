"use client";

import { useMemo, useState } from "react";

import { TaskDetailPanel } from "@/components/tasks/detail/task-detail-panel";
import { CalendarBoard } from "@/components/tasks/calendar/calendar-board";
import { useOrgClients, useOrgMembers } from "@/hooks/use-org-data";
import type { CalendarConfig } from "@/lib/tasks/calendar-config";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import type { TaskStatus } from "@/lib/database.types";

interface TasksCalendarViewProps {
  tasks: TaskWithMeta[];
  projectId?: string | null;
  calendarConfig: CalendarConfig;
  onCalendarConfigChange: (config: CalendarConfig) => void;
  createTask: (input: {
    name: string;
    project_id?: string | null;
    due_date?: string | null;
    custom_data?: Record<string, unknown>;
    status?: TaskStatus;
  }) => Promise<TaskWithMeta>;
  updateTask: (input: {
    id: string;
    patch: Record<string, unknown>;
  }) => Promise<TaskWithMeta>;
  currentUserId?: string;
  isCreating?: boolean;
}

export function TasksCalendarView({
  tasks,
  projectId,
  calendarConfig,
  onCalendarConfigChange,
  createTask,
  updateTask,
  currentUserId,
  isCreating,
}: TasksCalendarViewProps) {
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
      <CalendarBoard
        tasks={tasks}
        projectId={projectId}
        calendarConfig={calendarConfig}
        onCalendarConfigChange={onCalendarConfigChange}
        createTask={createTask}
        updateTask={updateTask}
        onOpenTask={setDetailTask}
        isCreating={isCreating}
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
