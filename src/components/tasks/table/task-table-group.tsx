"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DraftTaskRow,
  type DraftTaskValues,
} from "@/components/tasks/table/draft-task-row";
import { SortableTaskRow } from "@/components/tasks/table/sortable-task-row";
import { TaskTableFooter } from "@/components/tasks/table/task-table-footer";
import { TaskTableHeader } from "@/components/tasks/table/task-table-header";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { OrgClient, OrgMember } from "@/hooks/use-org-data";
import type { CustomColumnRow } from "@/lib/custom-columns/types";
import type { ColumnDefinition, SortLevel, TaskWithMeta } from "@/lib/tasks/client-filter";
import type { CustomFieldType } from "@/lib/database.types";
import type { TableGroup } from "@/lib/tasks/table-groups";
import { getGroupHeaderMeta } from "@/lib/tasks/table-groups";
import { TASK_STATUS_META } from "@/lib/tasks/constants";
import { cn } from "@/lib/utils";

interface TaskTableGroupProps {
  group: TableGroup;
  columns: ColumnDefinition[];
  groupBy: string | null;
  sortConfig: SortLevel[];
  onSortColumn: (columnId: string) => void;
  onUpdateTask: (taskId: string, patch: Record<string, unknown>) => void;
  onReorderTask: (taskId: string, afterId?: string, beforeId?: string) => void;
  onExpandTask: (task: TaskWithMeta) => void;
  members: OrgMember[];
  clients: OrgClient[];
  draft: DraftTaskValues | null;
  isDraftActive: boolean;
  onStartDraft: () => void;
  onDraftChange: (values: DraftTaskValues) => void;
  onDraftSave: () => void;
  onDraftCancel: () => void;
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

export function TaskTableGroup({
  group,
  columns,
  groupBy,
  sortConfig,
  onSortColumn,
  onUpdateTask,
  onReorderTask,
  onExpandTask,
  members,
  clients,
  draft,
  isDraftActive,
  onStartDraft,
  onDraftChange,
  onDraftSave,
  onDraftCancel,
  customColumnsData,
  customColumnCount,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
  onReorderCustomColumns,
  isCreatingColumn,
  isUpdatingColumn,
}: TaskTableGroupProps) {
  const [open, setOpen] = useState(true);
  const headerMeta = getGroupHeaderMeta(group.key, groupBy, group.tasks);

  useEffect(() => {
    if (isDraftActive) {
      setOpen(true);
    }
  }, [isDraftActive]);
  const statusMeta =
    headerMeta.type === "status"
      ? TASK_STATUS_META[headerMeta.status]
      : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = group.tasks.findIndex((task) => task.id === active.id);
    const overIndex = group.tasks.findIndex((task) => task.id === over.id);

    if (activeIndex < 0 || overIndex < 0) return;

    const movedTask = group.tasks[activeIndex];
    const targetTask = group.tasks[overIndex];

    if (activeIndex < overIndex) {
      onReorderTask(movedTask.id, targetTask.id);
    } else {
      onReorderTask(movedTask.id, undefined, targetTask.id);
    }
  }

  const statusBorderColor = statusMeta?.color ?? "#6366f1";

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="overflow-hidden rounded-lg border">
      <CollapsibleTrigger className="flex w-full items-center justify-between bg-muted/40 px-4 py-2.5 text-left">
        <div className="flex items-center gap-2">
          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
            style={
              statusMeta
                ? {
                    color: statusMeta.color,
                    backgroundColor: statusMeta.bgColor,
                  }
                : undefined
            }
          >
            {group.label}
          </span>
          <span className="text-xs text-muted-foreground">{group.tasks.length}</span>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full min-w-[960px] text-sm">
              <TaskTableHeader
                columns={columns}
                customColumnsData={customColumnsData}
                sortConfig={sortConfig}
                onSortColumn={onSortColumn}
                customColumnCount={customColumnCount}
                onCreateColumn={onCreateColumn}
                onUpdateColumn={onUpdateColumn}
                onDeleteColumn={onDeleteColumn}
                onReorderCustomColumns={onReorderCustomColumns}
                isCreatingColumn={isCreatingColumn}
                isUpdatingColumn={isUpdatingColumn}
              />
              <tbody>
                <SortableContext
                  items={group.tasks.map((task) => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {group.tasks.map((task) => (
                    <SortableTaskRow
                      key={task.id}
                      task={task}
                      columns={columns}
                      onPatch={(patch) => onUpdateTask(task.id, patch)}
                      onExpand={() => onExpandTask(task)}
                      members={members}
                      clients={clients}
                    />
                  ))}
                </SortableContext>

                {isDraftActive && draft ? (
                  <DraftTaskRow
                    columns={columns}
                    values={draft}
                    onChange={onDraftChange}
                    onSave={onDraftSave}
                    onCancel={onDraftCancel}
                    members={members}
                    clients={clients}
                    statusBorderColor={statusBorderColor}
                  />
                ) : null}
              </tbody>
              <TaskTableFooter columns={columns} tasks={group.tasks} />
            </table>
          </DndContext>
        </div>

        {!isDraftActive ? (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-muted-foreground"
              onClick={onStartDraft}
            >
              <Plus className="size-3.5" />
              Add task
            </Button>
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
