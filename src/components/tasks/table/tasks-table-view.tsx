"use client";

import { useEffect, useMemo, useState } from "react";

import { TaskDetailPanel } from "@/components/tasks/detail/task-detail-panel";
import type { DraftTaskValues } from "@/components/tasks/table/draft-task-row";
import { TaskTableGroup } from "@/components/tasks/table/task-table-group";
import { useOrgClients, useOrgMembers } from "@/hooks/use-org-data";
import type { CustomColumnRow } from "@/lib/custom-columns/types";
import type { ColumnDefinition, TaskWithMeta, ViewPreferencesState } from "@/lib/tasks/client-filter";
import type { CustomFieldType } from "@/lib/database.types";
import { createEmptyDraft } from "@/lib/tasks/draft";
import { buildTableGroups } from "@/lib/tasks/table-groups";
import type { TaskStatus } from "@/lib/database.types";

interface TasksTableViewProps {
  tasks: TaskWithMeta[];
  columns: ColumnDefinition[];
  preferences: ViewPreferencesState;
  onSortColumn: (columnId: string) => void;
  projectId?: string | null;
  createTask: (input: {
    name: string;
    project_id?: string | null;
    status?: TaskStatus;
    priority?: TaskWithMeta["priority"];
    due_date?: string | null;
    client_id?: string | null;
    member_ids?: string[];
  }) => Promise<TaskWithMeta>;
  updateTask: (input: {
    id: string;
    patch: Record<string, unknown>;
  }) => Promise<TaskWithMeta>;
  activeDraftGroup: string | null;
  draftValues: DraftTaskValues | null;
  onDraftChange: (values: DraftTaskValues) => void;
  onDraftClear: () => void;
  onStartDraftInGroup: (groupKey: string) => void;
  currentUserId?: string;
  customColumnsData: CustomColumnRow[];
  customColumnCount: number;
  onCreateColumn: (input: {
    name: string;
    field_type: CustomFieldType;
    options?: { label: string; color: string }[];
    config?: import("@/lib/custom-columns/types").ColumnConfig;
  }) => Promise<void>;
  onUpdateColumn: (
    id: string,
    patch: {
      name?: string;
      options?: { label: string; color: string }[];
      config?: import("@/lib/custom-columns/types").ColumnConfig;
      is_visible?: boolean;
    },
  ) => Promise<void>;
  onDeleteColumn: (id: string) => Promise<void>;
  onReorderCustomColumns: (orderedIds: string[]) => void;
  isCreatingColumn?: boolean;
  isUpdatingColumn?: boolean;
}

export function TasksTableView({
  tasks,
  columns,
  preferences,
  onSortColumn,
  projectId,
  createTask,
  updateTask,
  activeDraftGroup,
  draftValues,
  onDraftChange,
  onDraftClear,
  onStartDraftInGroup,
  currentUserId,
  customColumnsData,
  customColumnCount,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
  onReorderCustomColumns,
  isCreatingColumn,
  isUpdatingColumn,
}: TasksTableViewProps) {
  const { data: members = [] } = useOrgMembers();
  const { data: clients = [] } = useOrgClients();
  const [detailTask, setDetailTask] = useState<TaskWithMeta | null>(null);

  const detailTaskId = detailTask?.id ?? null;

  useEffect(() => {
    if (!detailTaskId) return;
    const fresh = tasks.find((task) => task.id === detailTaskId);
    if (fresh) setDetailTask(fresh);
  }, [tasks, detailTaskId]);

  const groups = useMemo(
    () => buildTableGroups(tasks, preferences.group_by),
    [tasks, preferences.group_by],
  );

  async function handleDraftSave() {
    if (!draftValues || !activeDraftGroup) return;

    const name = draftValues.name.trim();
    if (!name) {
      onDraftClear();
      return;
    }

    await createTask({
      name,
      project_id: projectId ?? null,
      status: draftValues.status,
      priority: draftValues.priority,
      due_date: draftValues.due_date,
      client_id: draftValues.client_id,
      member_ids: draftValues.member_ids,
    });

    onDraftChange(createEmptyDraft(activeDraftGroup, preferences.group_by));

    requestAnimationFrame(() => {
      const nameInput = document.querySelector<HTMLInputElement>(
        'input[placeholder="Task name..."]',
      );
      nameInput?.focus();
    });
  }

  return (
    <>
      <div className="space-y-4">
        {groups.map((group) => (
          <TaskTableGroup
            key={group.key}
            group={group}
            columns={columns}
            groupBy={preferences.group_by}
            sortConfig={preferences.sort_config}
            onSortColumn={onSortColumn}
            onUpdateTask={(taskId, patch) => updateTask({ id: taskId, patch })}
            onReorderTask={(taskId, afterId, beforeId) =>
              updateTask({
                id: taskId,
                patch: {
                  ...(afterId ? { after_id: afterId } : {}),
                  ...(beforeId ? { before_id: beforeId } : {}),
                },
              })
            }
            onExpandTask={setDetailTask}
            members={members}
            clients={clients}
            draft={activeDraftGroup === group.key ? draftValues : null}
            isDraftActive={
              activeDraftGroup === group.key && draftValues !== null
            }
            onStartDraft={() => onStartDraftInGroup(group.key)}
            onDraftChange={onDraftChange}
            onDraftSave={handleDraftSave}
            onDraftCancel={onDraftClear}
            customColumnsData={customColumnsData}
            customColumnCount={customColumnCount}
            onCreateColumn={onCreateColumn}
            onUpdateColumn={onUpdateColumn}
            onDeleteColumn={onDeleteColumn}
            onReorderCustomColumns={onReorderCustomColumns}
            isCreatingColumn={isCreatingColumn}
            isUpdatingColumn={isUpdatingColumn}
          />
        ))}
      </div>

      <TaskDetailPanel
        task={detailTask}
        open={detailTask !== null}
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
