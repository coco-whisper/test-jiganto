"use client";

import Gantt, {
  type GanttConfig,
  type Marker,
  type ReactGanttRef,
  type Task,
} from "@dhtmlx/trial-react-gantt";
import "@dhtmlx/trial-react-gantt/dist/react-gantt.css";
import { useMemo, useRef } from "react";

import "@/components/tasks/timeline/timeline-gantt.css";
import {
  ganttDatesToPatch,
  toGanttTasks,
} from "@/lib/tasks/timeline-data";
import { buildTimelineGanttConfig } from "@/lib/tasks/timeline-scales";
import type { TimelineZoom } from "@/lib/tasks/timeline-config";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";

interface TimelineGanttProps {
  scheduledTasks: TaskWithMeta[];
  zoom: TimelineZoom;
  onOpenTask: (task: TaskWithMeta) => void;
  onUpdateDates: (
    taskId: string,
    patch: { start_date: string | null; due_date: string | null },
  ) => void;
}

export function TimelineGantt({
  scheduledTasks,
  zoom,
  onOpenTask,
  onUpdateDates,
}: TimelineGanttProps) {
  const ganttRef = useRef<ReactGanttRef>(null);
  const taskById = useMemo(
    () => new Map(scheduledTasks.map((task) => [task.id, task])),
    [scheduledTasks],
  );

  const ganttTasks = useMemo(
    () => toGanttTasks(scheduledTasks),
    [scheduledTasks],
  );

  const config = useMemo<GanttConfig>(
    () => buildTimelineGanttConfig(zoom),
    [zoom],
  );

  const markers = useMemo<Marker[]>(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return [
      {
        start_date: today,
        css: "timeline-today-marker",
        text: "Today",
      },
    ];
  }, []);

  function handleTaskClick(id: string | number) {
    const task = taskById.get(String(id));
    if (task) onOpenTask(task);
    return true;
  }

  function handleAfterTaskDrag(id: string | number, mode: string) {
    if (mode === "ignore" || mode === "progress") return;

    const instance = ganttRef.current?.instance;
    if (!instance) return;

    const ganttTask = instance.getTask(id) as Task;
    if (!ganttTask?.start_date || !ganttTask?.end_date) return;

    const start =
      ganttTask.start_date instanceof Date
        ? ganttTask.start_date
        : new Date(ganttTask.start_date);
    const end =
      ganttTask.end_date instanceof Date
        ? ganttTask.end_date
        : new Date(ganttTask.end_date);

    onUpdateDates(String(id), ganttDatesToPatch(start, end));
  }

  return (
    <div className="jiganto-timeline-gantt h-[min(520px,calc(100vh-320px))] min-h-[360px] overflow-hidden rounded-lg border bg-background">
      <Gantt
        ref={ganttRef}
        tasks={ganttTasks}
        links={[]}
        config={config}
        markers={markers}
        theme="terrace"
        onTaskClick={handleTaskClick}
        onAfterTaskDrag={handleAfterTaskDrag}
        onBeforeLightbox={() => false}
      />
    </div>
  );
}
