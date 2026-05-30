"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { ViewMode } from "@/lib/database.types";

interface TaskViewSkeletonProps {
  viewMode: ViewMode;
}

export function TaskViewSkeleton({ viewMode }: TaskViewSkeletonProps) {
  if (viewMode === "kanban") {
    return (
      <div
        className="grid gap-4 md:grid-cols-3 lg:grid-cols-4"
        aria-busy="true"
        aria-label="Loading kanban view"
      >
        {Array.from({ length: 4 }).map((_, columnIndex) => (
          <div key={columnIndex} className="space-y-3 rounded-lg border bg-muted/10 p-3">
            <Skeleton className="h-5 w-24 rounded-full" />
            {Array.from({ length: 3 - (columnIndex % 2) }).map((__, cardIndex) => (
              <div key={cardIndex} className="space-y-2 rounded-md border bg-background p-3">
                <Skeleton className="h-4 w-[80%]" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-1 pt-1">
                  <Skeleton className="size-5 rounded-full" />
                  <Skeleton className="size-5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === "timeline" || viewMode === "calendar") {
    return (
      <div
        className="space-y-4 rounded-lg border p-4"
        aria-busy="true"
        aria-label={`Loading ${viewMode} view`}
      >
        <div className="flex gap-2 border-b pb-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-8 flex-1" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-3">
            <Skeleton className="h-4 w-24 shrink-0" />
            <Skeleton
              className="h-8 rounded-md"
              style={{ width: `${40 + (rowIndex % 3) * 15}%` }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading board view"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-lg border p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="size-6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
