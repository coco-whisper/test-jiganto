"use client";

import { Skeleton } from "@/components/ui/skeleton";

import { TaskDetailAttachments } from "@/components/tasks/detail/task-detail-attachments";
import { TaskDetailComments } from "@/components/tasks/detail/task-detail-comments";
import { TaskDetailCoreFields } from "@/components/tasks/detail/task-detail-core-fields";
import { TaskDetailDescription } from "@/components/tasks/detail/task-detail-description";
import { TaskDetailSubtasks } from "@/components/tasks/detail/task-detail-subtasks";
import { TaskDetailTimeTracking } from "@/components/tasks/detail/task-detail-time-tracking";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import type { OrgClient, OrgMember } from "@/hooks/use-org-data";
import {
  useTaskCustomColumns,
  useTaskDetail,
  useUpdateTask,
} from "@/hooks/use-task-detail-data";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import { TASK_STATUS_META } from "@/lib/tasks/constants";

interface TaskDetailPanelProps {
  task: TaskWithMeta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: OrgMember[];
  clients: OrgClient[];
  currentUserId?: string;
  onTaskUpdated?: (task: TaskWithMeta) => void;
}

export function TaskDetailPanel({
  task: taskProp,
  open,
  onOpenChange,
  members,
  clients,
  currentUserId,
  onTaskUpdated,
}: TaskDetailPanelProps) {
  const taskId = taskProp?.id ?? null;
  const { data: fetchedTask, isLoading } = useTaskDetail(open ? taskId : null);
  const updateTask = useUpdateTask(taskId);
  const { data: customColumns = [] } = useTaskCustomColumns(
    taskProp?.project_id,
  );

  const task = fetchedTask ?? taskProp;

  function handlePatch(patch: Record<string, unknown>) {
    if (!taskId) return;
    updateTask.mutate(patch, {
      onSuccess: (updated) => {
        onTaskUpdated?.(updated);
      },
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-xl">
        {task ? (
          <>
            <SheetHeader className="shrink-0 text-left">
              <SheetTitle className="pr-8 line-clamp-2">{task.name}</SheetTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="rounded px-1.5 py-0.5 capitalize"
                  style={{
                    color: TASK_STATUS_META[task.status].color,
                    backgroundColor: TASK_STATUS_META[task.status].bgColor,
                  }}
                >
                  {TASK_STATUS_META[task.status].label}
                </span>
                <span>{task.progress_label ?? `${task.progress}%`}</span>
              </div>
              <Progress value={task.progress} className="h-1.5" />
            </SheetHeader>

            {isLoading && !fetchedTask ? (
              <div className="mt-4 flex flex-1 flex-col gap-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-2 w-full" />
                <div className="grid gap-3 pt-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                  ))}
                </div>
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <Tabs
                defaultValue="details"
                className="mt-4 flex min-h-0 flex-1 flex-col"
              >
                <TabsList className="grid w-full shrink-0 grid-cols-5">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="subtasks">Sub-tasks</TabsTrigger>
                  <TabsTrigger value="comments">Comments</TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="time">Time</TabsTrigger>
                </TabsList>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto p-1">
                  <TabsContent value="details" className="mt-0 space-y-6">
                    <TaskDetailCoreFields
                      task={task}
                      members={members}
                      clients={clients}
                      customColumns={customColumns}
                      onPatch={handlePatch}
                    />
                    <TaskDetailDescription
                      taskId={task.id}
                      description={task.description}
                      onSave={(description) => handlePatch({ description })}
                    />
                  </TabsContent>

                  <TabsContent value="subtasks" className="mt-0">
                    <TaskDetailSubtasks taskId={task.id} members={members} />
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0">
                    <TaskDetailComments
                      taskId={task.id}
                      members={members}
                      currentUserId={currentUserId}
                    />
                  </TabsContent>

                  <TabsContent value="files" className="mt-0">
                    <TaskDetailAttachments taskId={task.id} />
                  </TabsContent>

                  <TabsContent value="time" className="mt-0">
                    <TaskDetailTimeTracking taskId={task.id} />
                  </TabsContent>
                </div>
              </Tabs>
            )}

            {updateTask.isPending ? (
              <p className="shrink-0 text-xs text-muted-foreground">
                Saving...
              </p>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
