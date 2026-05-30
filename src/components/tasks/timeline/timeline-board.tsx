"use client";

import dynamic from "next/dynamic";

import { TimelineHeader } from "@/components/tasks/timeline/timeline-header";
import { TimelineUnscheduledPanel } from "@/components/tasks/timeline/timeline-unscheduled-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { partitionTimelineTasks } from "@/lib/tasks/timeline-data";
import type { TimelineConfig } from "@/lib/tasks/timeline-config";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";

const TimelineGantt = dynamic(
  () =>
    import("@/components/tasks/timeline/timeline-gantt").then(
      (mod) => mod.TimelineGantt,
    ),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-[min(520px,calc(100vh-320px))] min-h-[360px] w-full rounded-lg" />
    ),
  },
);

interface TimelineBoardProps {
  tasks: TaskWithMeta[];
  timelineConfig: TimelineConfig;
  onTimelineConfigChange: (config: TimelineConfig) => void;
  onOpenTask: (task: TaskWithMeta) => void;
  onUpdateDates: (
    taskId: string,
    patch: { start_date: string | null; due_date: string | null },
  ) => void;
}

export function TimelineBoard({
  tasks,
  timelineConfig,
  onTimelineConfigChange,
  onOpenTask,
  onUpdateDates,
}: TimelineBoardProps) {
  const { scheduled, unscheduled } = partitionTimelineTasks(tasks);

  return (
    <div>
      <TimelineHeader
        config={timelineConfig}
        onConfigChange={onTimelineConfigChange}
        scheduledCount={scheduled.length}
        unscheduledCount={unscheduled.length}
      />

      {scheduled.length > 0 ? (
        <TimelineGantt
          scheduledTasks={scheduled}
          zoom={timelineConfig.zoom}
          onOpenTask={onOpenTask}
          onUpdateDates={onUpdateDates}
        />
      ) : (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
          <p className="text-sm text-muted-foreground">
            No scheduled tasks — set start or due dates to see bars here.
          </p>
        </div>
      )}

      <TimelineUnscheduledPanel
        tasks={unscheduled}
        onOpenTask={onOpenTask}
        visible={timelineConfig.show_unscheduled}
      />
    </div>
  );
}
