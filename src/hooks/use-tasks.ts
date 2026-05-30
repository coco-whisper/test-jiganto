"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useMutationToast } from "@/hooks/use-mutation-toast";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";

export interface UseTasksOptions {
  projectId?: string | null;
  mine?: boolean;
  includeArchived?: boolean;
  enabled?: boolean;
}

function buildTasksUrl(options: UseTasksOptions): string {
  const params = new URLSearchParams();

  if (options.projectId) {
    params.set("project_id", options.projectId);
  } else {
    params.set("standalone", "true");
    if (options.mine) {
      params.set("mine", "true");
    }
  }

  if (options.includeArchived) {
    params.set("include_archived", "true");
  }

  return `/api/tasks?${params.toString()}`;
}

export function tasksQueryKey(options: UseTasksOptions) {
  return [
    "tasks",
    {
      projectId: options.projectId ?? null,
      mine: options.mine ?? false,
      includeArchived: options.includeArchived ?? false,
    },
  ] as const;
}

async function fetchTasks(options: UseTasksOptions): Promise<TaskWithMeta[]> {
  const response = await fetch(buildTasksUrl(options));

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to load tasks");
  }

  const payload = await response.json();
  return payload.tasks ?? [];
}

export function useTasks(options: UseTasksOptions) {
  const queryClient = useQueryClient();
  const queryKey = tasksQueryKey(options);
  const mutationToast = useMutationToast();

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTasks(options),
    enabled: options.enabled ?? true,
  });

  const createTask = useMutation({
    mutationFn: async (input: {
      name: string;
      project_id?: string | null;
      status?: TaskWithMeta["status"];
      priority?: TaskWithMeta["priority"];
      due_date?: string | null;
      client_id?: string | null;
      member_ids?: string[];
      custom_data?: Record<string, unknown>;
    }) => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          project_id: input.project_id ?? options.projectId ?? null,
          status: input.status,
          priority: input.priority,
          due_date: input.due_date,
          client_id: input.client_id,
          member_ids: input.member_ids,
          custom_data: input.custom_data,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create task");
      }

      return payload.task as TaskWithMeta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      mutationToast.created("Task added to the list.");
    },
    onError: (error) => {
      mutationToast.error(error, "Failed to create task");
    },
  });

  const updateTask = useMutation({
    mutationFn: async (input: { id: string; patch: Record<string, unknown> }) => {
      const response = await fetch(`/api/tasks/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.patch),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update task");
      }

      return payload.task as TaskWithMeta;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskWithMeta[]>(queryKey);

      queryClient.setQueryData<TaskWithMeta[]>(queryKey, (current) =>
        (current ?? []).map((task) =>
          task.id === input.id ? { ...task, ...input.patch } : task,
        ),
      );

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      mutationToast.error(error, "Failed to save task");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return {
    ...query,
    tasks: query.data ?? [],
    createTask,
    updateTask,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  };
}
