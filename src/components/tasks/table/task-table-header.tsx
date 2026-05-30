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
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical } from "lucide-react";

import { CustomColumnHeaderMenu } from "@/components/tasks/columns/custom-column-header-menu";
import { FieldTypePicker } from "@/components/tasks/columns/field-type-picker";
import type { CustomColumnRow } from "@/lib/custom-columns/types";
import { splitTableColumns } from "@/lib/custom-columns/merge-columns";
import type { ColumnDefinition, SortLevel } from "@/lib/tasks/client-filter";
import type { CustomFieldType } from "@/lib/database.types";
import { cn } from "@/lib/utils";

interface TaskTableHeaderProps {
  columns: ColumnDefinition[];
  customColumnsData: CustomColumnRow[];
  sortConfig: SortLevel[];
  onSortColumn: (columnId: string) => void;
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

function SortableCustomHeader({
  column,
  customColumn,
  sortConfig,
  onSortColumn,
  onUpdateColumn,
  onDeleteColumn,
  isUpdating,
}: {
  column: ColumnDefinition;
  customColumn: CustomColumnRow;
  sortConfig: SortLevel[];
  onSortColumn: (columnId: string) => void;
  onUpdateColumn: TaskTableHeaderProps["onUpdateColumn"];
  onDeleteColumn: TaskTableHeaderProps["onDeleteColumn"];
  isUpdating?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const level = sortConfig.find((item) => item.column === column.id);

  return (
    <th
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group/header px-3 py-2 text-left text-xs font-medium text-muted-foreground",
        isDragging && "z-10 bg-muted",
      )}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
        <button
          type="button"
          className="inline-flex flex-1 items-center hover:text-foreground"
          onClick={() => onSortColumn(column.id)}
        >
          {column.label}
          {level ? (
            level.direction === "asc" ? (
              <ArrowUp className="ml-1 size-3" />
            ) : (
              <ArrowDown className="ml-1 size-3" />
            )
          ) : (
            <ArrowUpDown className="ml-1 size-3 opacity-40" />
          )}
        </button>
        <CustomColumnHeaderMenu
          column={customColumn}
          onUpdate={onUpdateColumn}
          onDelete={onDeleteColumn}
          isUpdating={isUpdating}
        />
      </div>
    </th>
  );
}

export function TaskTableHeader({
  columns,
  customColumnsData,
  sortConfig,
  onSortColumn,
  customColumnCount,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
  onReorderCustomColumns,
  isCreatingColumn,
  isUpdatingColumn,
}: TaskTableHeaderProps) {
  const { builtIn, custom } = splitTableColumns(columns);
  const customById = new Map(customColumnsData.map((column) => [column.id, column]));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = custom.map((column) => column.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = [...ids];
    const [removed] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, removed);
    onReorderCustomColumns(next);
  }

  function getSortIndicator(columnId: string, sortable: boolean) {
    if (!sortable) return null;
    const level = sortConfig.find((item) => item.column === columnId);
    if (!level) return <ArrowUpDown className="ml-1 size-3 opacity-40" />;
    return level.direction === "asc" ? (
      <ArrowUp className="ml-1 size-3" />
    ) : (
      <ArrowDown className="ml-1 size-3" />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        container: typeof document !== "undefined" ? document.body : undefined,
      }}
    >
      <thead className="border-b bg-background">
        <tr>
          <th className="w-8 px-2" />
          {builtIn.map((column) => (
            <th
              key={column.id}
              className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
            >
              {column.sortable ? (
                <button
                  type="button"
                  className="inline-flex items-center hover:text-foreground"
                  onClick={() => onSortColumn(column.id)}
                >
                  {column.label}
                  {getSortIndicator(column.id, true)}
                </button>
              ) : (
                column.label
              )}
            </th>
          ))}
          <SortableContext
            items={custom.map((column) => column.id)}
            strategy={horizontalListSortingStrategy}
          >
            {custom.map((column) => {
              const data = customById.get(column.id);
              if (!data) return null;
              return (
                <SortableCustomHeader
                  key={column.id}
                  column={column}
                  customColumn={data}
                  sortConfig={sortConfig}
                  onSortColumn={onSortColumn}
                  onUpdateColumn={onUpdateColumn}
                  onDeleteColumn={onDeleteColumn}
                  isUpdating={isUpdatingColumn}
                />
              );
            })}
          </SortableContext>
          <th className="w-10 px-2 py-2">
            <FieldTypePicker
              customColumnCount={customColumnCount}
              onCreateColumn={onCreateColumn}
              isCreating={isCreatingColumn}
            />
          </th>
        </tr>
      </thead>
    </DndContext>
  );
}
