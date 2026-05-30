"use client";

import { useMemo, useState } from "react";

import { TaskDetailPanel } from "@/components/tasks/detail/task-detail-panel";
import { KanbanBoard } from "@/components/tasks/kanban/kanban-board";
import { useOrgClients, useOrgMembers } from "@/hooks/use-org-data";
import type { CustomColumnRow } from "@/lib/custom-columns/types";
import type { KanbanConfig, TaskWithMeta, ViewPreferencesState } from "@/lib/tasks/client-filter";
import type { TaskStatus } from "@/lib/database.types";

interface TasksKanbanViewProps {
  tasks: TaskWithMeta[];
  preferences: ViewPreferencesState;
  projectId?: string | null;
  customColumns: CustomColumnRow[];
  kanbanConfig: KanbanConfig;
  onKanbanConfigChange: (config: KanbanConfig) => void;
  createTask: (input: {
    name: string;
    project_id?: string | null;
    status?: TaskStatus;
    priority?: TaskWithMeta["priority"];
    due_date?: string | null;
    client_id?: string | null;
    member_ids?: string[];
    custom_data?: Record<string, unknown>;
  }) => Promise<TaskWithMeta>;
  updateTask: (input: {
    id: string;
    patch: Record<string, unknown>;
  }) => Promise<TaskWithMeta>;
  currentUserId?: string;
  isCreating?: boolean;
}

export function TasksKanbanView({
  tasks,
  preferences,
  projectId,
  customColumns,
  kanbanConfig,
  onKanbanConfigChange,
  createTask,
  updateTask,
  currentUserId,
  isCreating,
}: TasksKanbanViewProps) {
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
      <KanbanBoard
        tasks={tasks}
        preferences={preferences}
        projectId={projectId}
        members={members}
        clients={clients}
        customColumns={customColumns}
        kanbanConfig={kanbanConfig}
        onKanbanConfigChange={onKanbanConfigChange}
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
