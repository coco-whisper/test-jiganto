"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  BUILT_IN_COLUMNS,
  loadColumnLayout,
  saveColumnLayout,
} from "@/lib/tasks/column-definitions";

interface EditViewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string | null;
  hiddenColumns: string[];
  onSave: (hiddenColumns: string[]) => void;
}

function SortableColumnRow({
  id,
  label,
  hidden,
  onToggleHidden,
  onRename,
}: {
  id: string;
  label: string;
  hidden: boolean;
  onToggleHidden: (checked: boolean) => void;
  onRename: (value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <Checkbox
        checked={!hidden}
        onCheckedChange={(checked) => onToggleHidden(Boolean(checked))}
      />
      <Input
        value={label}
        onChange={(event) => onRename(event.target.value)}
        className="h-8"
      />
    </div>
  );
}

export function EditViewSheet({
  open,
  onOpenChange,
  projectId,
  hiddenColumns,
  onSave,
}: EditViewSheetProps) {
  const [order, setOrder] = useState<string[]>(
    BUILT_IN_COLUMNS.map((column) => column.id),
  );
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [localHidden, setLocalHidden] = useState<string[]>(hiddenColumns);

  useEffect(() => {
    if (open) {
      const layout = loadColumnLayout(projectId);
      setOrder(layout.order);
      setLabels(layout.labels);
      setLocalHidden(hiddenColumns);
    }
  }, [open, projectId, hiddenColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setOrder((current) => {
      const oldIndex = current.indexOf(String(active.id));
      const newIndex = current.indexOf(String(over.id));
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  function getLabel(columnId: string) {
    const builtIn = BUILT_IN_COLUMNS.find((column) => column.id === columnId);
    return labels[columnId] ?? builtIn?.label ?? columnId;
  }

  function handleSave() {
    saveColumnLayout(projectId, { order, labels });
    onSave(localHidden);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit view</SheetTitle>
          <SheetDescription>
            Show, hide, rename, and reorder columns for this task list.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 py-4">
                {order.map((columnId) => (
                  <SortableColumnRow
                    key={columnId}
                    id={columnId}
                    label={getLabel(columnId)}
                    hidden={localHidden.includes(columnId)}
                    onToggleHidden={(visible) => {
                      setLocalHidden((current) =>
                        visible
                          ? current.filter((id) => id !== columnId)
                          : [...current, columnId],
                      );
                    }}
                    onRename={(value) =>
                      setLabels((current) => ({
                        ...current,
                        [columnId]: value,
                      }))
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </ScrollArea>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save view</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
