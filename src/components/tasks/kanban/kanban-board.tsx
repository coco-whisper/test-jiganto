"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";

import { KanbanCard } from "@/components/tasks/kanban/kanban-card";
import { KanbanColumn } from "@/components/tasks/kanban/kanban-column";
import { useToast } from "@/hooks/use-toast";
import type { OrgClient, OrgMember } from "@/hooks/use-org-data";
import type { CustomColumnRow } from "@/lib/custom-columns/types";
import type { KanbanConfig, TaskWithMeta, ViewPreferencesState } from "@/lib/tasks/client-filter";
import {
  buildKanbanColumns,
  buildKanbanMovePatch,
  getTaskKanbanColumnKey,
  resolveKanbanDropColumnKey,
} from "@/lib/tasks/kanban";
import {
  getDraftCustomDataForGroup,
  getDraftDefaultsForGroup,
} from "@/lib/tasks/table-groups";
import type { TaskStatus } from "@/lib/database.types";

interface KanbanBoardProps {
  tasks: TaskWithMeta[];
  preferences: ViewPreferencesState;
  projectId?: string | null;
  members: OrgMember[];
  clients: OrgClient[];
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
  onOpenTask: (task: TaskWithMeta) => void;
  isCreating?: boolean;
}

export function KanbanBoard({
  tasks,
  preferences,
  projectId,
  members,
  clients,
  customColumns,
  kanbanConfig,
  onKanbanConfigChange,
  createTask,
  updateTask,
  onOpenTask,
  isCreating,
}: KanbanBoardProps) {
  const { toast } = useToast();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const groupBy = preferences.group_by ?? "status";

  const columns = useMemo(
    () => buildKanbanColumns(tasks, groupBy, members, clients, customColumns),
    [tasks, groupBy, members, clients, customColumns],
  );

  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const targetKey = resolveKanbanDropColumnKey(over.id, tasks, groupBy);
    if (!targetKey) return;

    const currentKey = getTaskKanbanColumnKey(task, groupBy);
    if (currentKey === targetKey) return;

    const wipLimit = kanbanConfig.wip_limits[targetKey];
    const targetColumn = columns.find((column) => column.key === targetKey);
    if (
      wipLimit &&
      targetColumn &&
      targetColumn.tasks.length >= wipLimit
    ) {
      toast({
        title: "WIP limit reached",
        description: `This column is limited to ${wipLimit} cards.`,
        variant: "destructive",
      });
      return;
    }

    const patch = buildKanbanMovePatch(groupBy, targetKey, customColumns);
    if (Object.keys(patch).length === 0) return;

    if (patch.custom_data) {
      const existing =
        typeof task.custom_data === "object" &&
        task.custom_data !== null &&
        !Array.isArray(task.custom_data)
          ? (task.custom_data as Record<string, unknown>)
          : {};
      patch.custom_data = {
        ...existing,
        ...(patch.custom_data as Record<string, unknown>),
      };
    }

    await updateTask({ id: taskId, patch });
  }

  function setWipLimit(columnKey: string, limit: number | null) {
    const next = { ...kanbanConfig.wip_limits };
    if (limit == null) {
      delete next[columnKey];
    } else {
      next[columnKey] = limit;
    }
    onKanbanConfigChange({ wip_limits: next });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4 pb-4 md:flex-row md:overflow-x-auto">
        {columns.map((column) => (
          <KanbanColumn
            key={column.key}
            column={column}
            groupBy={groupBy}
            members={members}
            wipLimit={kanbanConfig.wip_limits[column.key]}
            onWipLimitChange={(limit) => setWipLimit(column.key, limit)}
            onOpenTask={onOpenTask}
            isCreating={isCreating}
            onCreateTask={async (name) => {
              const defaults = getDraftDefaultsForGroup(column.key, groupBy);
              const customColumn = customColumns.find(
                (col) => col.id === groupBy,
              );
              const custom_data = getDraftCustomDataForGroup(
                column.key,
                groupBy,
                customColumn?.field_type,
              );

              await createTask({
                name,
                project_id: projectId ?? null,
                status: defaults.status,
                priority: defaults.priority,
                client_id: defaults.client_id,
                member_ids: defaults.member_ids,
                ...(custom_data ? { custom_data } : {}),
              });
            }}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-[260px] rotate-2 opacity-95">
            <KanbanCard
              task={activeTask}
              members={members}
              onOpen={() => undefined}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
