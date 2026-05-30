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

import { CalendarCreateDialog } from "@/components/tasks/calendar/calendar-create-dialog";
import { CalendarHeader } from "@/components/tasks/calendar/calendar-header";
import { CalendarMonthGrid } from "@/components/tasks/calendar/calendar-month-grid";
import { CalendarTaskPill } from "@/components/tasks/calendar/calendar-task-pill";
import { CalendarUnscheduled } from "@/components/tasks/calendar/calendar-unscheduled";
import { CalendarWeekGrid } from "@/components/tasks/calendar/calendar-week-grid";
import type { CalendarConfig } from "@/lib/tasks/calendar-config";
import {
  buildSchedulePatch,
  getCalendarDueTime,
  getMonthGridDays,
  getWeekDays,
  parseCalendarDropTarget,
  partitionCalendarTasks,
} from "@/lib/tasks/calendar";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import type { TaskStatus } from "@/lib/database.types";

interface CalendarBoardProps {
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
  onOpenTask: (task: TaskWithMeta) => void;
  isCreating?: boolean;
}

export function CalendarBoard({
  tasks,
  projectId,
  calendarConfig,
  onCalendarConfigChange,
  createTask,
  updateTask,
  onOpenTask,
  isCreating,
}: CalendarBoardProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDueDate, setCreateDueDate] = useState<string | null>(null);
  const [createDueTime, setCreateDueTime] = useState<string | null>(null);

  const { scheduled, unscheduled } = useMemo(
    () => partitionCalendarTasks(tasks),
    [tasks],
  );

  const monthDays = useMemo(
    () => getMonthGridDays(calendarConfig.focus_date),
    [calendarConfig.focus_date],
  );

  const weekDays = useMemo(
    () => getWeekDays(calendarConfig.focus_date),
    [calendarConfig.focus_date],
  );

  const activeTask =
    tasks.find((task) => task.id === activeTaskId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function resolveDropTarget(overId: string | number) {
    const parsed = parseCalendarDropTarget(overId);
    if (parsed) return parsed;

    const id = String(overId);
    if (id.startsWith("calendar-task:")) {
      const taskId = id.replace("calendar-task:", "");
      const task = tasks.find((item) => item.id === taskId);
      if (!task?.due_date) return null;
      return {
        type: "day" as const,
        date: task.due_date.slice(0, 10),
        time: getCalendarDueTime(task) ?? null,
      };
    }

    return null;
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id).replace("calendar-task:", "");
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const target = resolveDropTarget(over.id);
    if (!target) return;

    let patch: Record<string, unknown>;

    if (target.type === "unscheduled") {
      patch = buildSchedulePatch(null, null, task.custom_data);
    } else if (target.type === "slot") {
      patch = buildSchedulePatch(
        target.date,
        target.time,
        task.custom_data,
      );
    } else {
      const time =
        "time" in target && target.time ? target.time : null;
      patch = buildSchedulePatch(target.date, time, task.custom_data);
    }

    await updateTask({ id: taskId, patch });
  }

  function openCreate(date: string, time?: string | null) {
    setCreateDueDate(date);
    setCreateDueTime(time ?? null);
    setCreateOpen(true);
  }

  return (
    <>
      <CalendarHeader
        config={calendarConfig}
        onConfigChange={onCalendarConfigChange}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event: DragStartEvent) => {
          const id = String(event.active.id);
          if (id.startsWith("calendar-task:")) {
            setActiveTaskId(id.replace("calendar-task:", ""));
          }
        }}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4">
          <div className="min-w-0 flex-1">
            {calendarConfig.sub_view === "month" ? (
              <CalendarMonthGrid
                days={monthDays}
                focusDate={calendarConfig.focus_date}
                scheduledTasks={scheduled}
                onOpenTask={onOpenTask}
                onDayClick={(date) => openCreate(date)}
              />
            ) : (
              <CalendarWeekGrid
                weekDays={weekDays}
                scheduledTasks={scheduled}
                onOpenTask={onOpenTask}
                onDayClick={(date) => openCreate(date)}
                onSlotClick={(date, time) => openCreate(date, time)}
              />
            )}
          </div>

          <CalendarUnscheduled
            tasks={unscheduled}
            onOpenTask={onOpenTask}
          />
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-[180px]">
              <CalendarTaskPill
                task={activeTask}
                onOpen={() => undefined}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CalendarCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        dueDate={createDueDate}
        dueTime={createDueTime}
        isSubmitting={isCreating}
        onSubmit={async (name) => {
          if (!createDueDate) return;

          const custom_data: Record<string, unknown> = {};
          if (createDueTime) {
            custom_data.calendar_due_time = createDueTime;
          }

          await createTask({
            name,
            project_id: projectId ?? null,
            due_date: createDueDate,
            ...(Object.keys(custom_data).length > 0 ? { custom_data } : {}),
          });
        }}
      />
    </>
  );
}
