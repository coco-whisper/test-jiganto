"use client";

import { useState } from "react";
import { Clock, Loader2, Play, Square } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTaskTimeLogs } from "@/hooks/use-task-detail-data";

interface TaskDetailTimeTrackingProps {
  taskId: string;
}

function formatDuration(mins: number) {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function TaskDetailTimeTracking({ taskId }: TaskDetailTimeTrackingProps) {
  const { data, isLoading, createTimeLog } = useTaskTimeLogs(taskId);
  const [manualMins, setManualMins] = useState("");
  const [description, setDescription] = useState("");

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const runningTimer = data.running_timer;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Total logged</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatDuration(data.total_mins)}
            </p>
          </div>
          <Clock className="size-8 text-muted-foreground" />
        </div>
      </div>

      <div className="flex gap-2">
        {runningTimer ? (
          <Button
            className="gap-2"
            variant="destructive"
            onClick={() =>
              createTimeLog.mutate({ task_id: taskId, stop_timer: true })
            }
            disabled={createTimeLog.isPending}
          >
            <Square className="size-4" />
            Stop timer
          </Button>
        ) : (
          <Button
            className="gap-2"
            onClick={() =>
              createTimeLog.mutate({
                task_id: taskId,
                started_at: new Date().toISOString(),
              })
            }
            disabled={createTimeLog.isPending}
          >
            <Play className="size-4" />
            Start timer
          </Button>
        )}
      </div>

      <div className="space-y-3 border-t pt-4">
        <Label>Manual entry</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={0}
            placeholder="Minutes"
            value={manualMins}
            onChange={(event) => setManualMins(event.target.value)}
          />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const mins = parseInt(manualMins, 10);
            if (Number.isNaN(mins) || mins < 0) return;
            createTimeLog.mutate({
              task_id: taskId,
              duration_mins: mins,
              description: description || null,
            });
            setManualMins("");
            setDescription("");
          }}
        >
          Add time entry
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground">Time log</Label>
        {data.time_logs.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium tabular-nums">
                {formatDuration(log.duration_mins)}
                {!log.ended_at && log.started_at ? (
                  <span className="ml-2 text-xs text-amber-600">Running</span>
                ) : null}
              </p>
              {log.description ? (
                <p className="text-xs text-muted-foreground">{log.description}</p>
              ) : null}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(log.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        ))}
        {data.time_logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No time logged yet.</p>
        ) : null}
      </div>
    </div>
  );
}
