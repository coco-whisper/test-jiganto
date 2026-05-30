"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { tasksQueryKey } from "@/hooks/use-tasks";

interface UseTasksRealtimeOptions {
  orgId: string;
  projectId?: string | null;
  mine?: boolean;
  includeArchived?: boolean;
  enabled?: boolean;
}

export function useTasksRealtime(options: UseTasksRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!options.enabled || !options.orgId) {
      return;
    }

    const supabase = createClient();

    const channel = supabase
      .channel(`tasks-realtime:${options.orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `org_id=eq.${options.orgId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          queryClient.invalidateQueries({
            queryKey: tasksQueryKey({
              projectId: options.projectId,
              mine: options.mine,
              includeArchived: options.includeArchived,
            }),
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    options.enabled,
    options.orgId,
    options.projectId,
    options.mine,
    options.includeArchived,
    queryClient,
  ]);
}
