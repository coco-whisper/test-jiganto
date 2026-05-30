"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useMutationToast } from "@/hooks/use-mutation-toast";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import type { Database } from "@/lib/database.types";

export type SubTask = Database["public"]["Tables"]["sub_tasks"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"] & {
  replies?: Comment[];
};
export type Attachment = Database["public"]["Tables"]["attachments"]["Row"] & {
  url?: string | null;
};
export type TimeLog = Database["public"]["Tables"]["time_logs"]["Row"];
export type CustomColumn = Database["public"]["Tables"]["custom_columns"]["Row"];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed: ${url}`);
  }

  return payload as T;
}

export function useTaskDetail(taskId: string | null) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () =>
      fetchJson<{ task: TaskWithMeta }>(`/api/tasks/${taskId}`).then(
        (data) => data.task,
      ),
    enabled: Boolean(taskId),
  });
}

export function useTaskSubTasks(taskId: string | null) {
  const queryClient = useQueryClient();
  const mutationToast = useMutationToast();

  const query = useQuery({
    queryKey: ["sub-tasks", taskId],
    queryFn: () =>
      fetchJson<{ sub_tasks: SubTask[] }>(
        `/api/sub-tasks?task_id=${taskId}`,
      ).then((data) => data.sub_tasks),
    enabled: Boolean(taskId),
  });

  const createSubTask = useMutation({
    mutationFn: (input: { name: string; assignee_id?: string | null }) =>
      fetchJson<{ sub_task: SubTask; task_progress: number }>("/api/sub-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, ...input }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub-tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      mutationToast.created("Sub-task added.");
    },
    onError: (error) => mutationToast.error(error, "Failed to add sub-task"),
  });

  const updateSubTask = useMutation({
    mutationFn: (input: {
      id: string;
      patch: Partial<Pick<SubTask, "name" | "is_done" | "assignee_id">>;
    }) =>
      fetchJson<{ sub_task: SubTask; task_progress: number }>(
        `/api/sub-tasks/${input.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input.patch),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub-tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      mutationToast.saved();
    },
    onError: (error) => mutationToast.error(error, "Failed to update sub-task"),
  });

  const deleteSubTask = useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ success: boolean }>(`/api/sub-tasks/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub-tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      mutationToast.saved("Sub-task removed.");
    },
    onError: (error) => mutationToast.error(error, "Failed to delete sub-task"),
  });

  return { ...query, createSubTask, updateSubTask, deleteSubTask };
}

export function useTaskComments(taskId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["comments", taskId],
    queryFn: () =>
      fetchJson<{ comments: Comment[] }>(
        `/api/comments?task_id=${taskId}&threaded=true`,
      ).then((data) => data.comments),
    enabled: Boolean(taskId),
  });

  const createComment = useMutation({
    mutationFn: (input: { body: string; parent_id?: string | null }) =>
      fetchJson<{ comment: Comment }>("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, ...input }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    },
  });

  return { ...query, createComment };
}

export function useTaskAttachments(taskId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["attachments", taskId],
    queryFn: () =>
      fetchJson<{ attachments: Attachment[] }>(
        `/api/attachments?task_id=${taskId}`,
      ).then((data) => data.attachments),
    enabled: Boolean(taskId),
  });

  const uploadAttachment = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("task_id", taskId!);
      formData.append("file", file);

      const response = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed");
      }

      return payload.attachment as Attachment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
    },
  });

  return { ...query, uploadAttachment };
}

export function useTaskTimeLogs(taskId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["time-logs", taskId],
    queryFn: () =>
      fetchJson<{
        time_logs: TimeLog[];
        total_mins: number;
        running_timer: TimeLog | null;
      }>(`/api/time-logs?task_id=${taskId}`),
    enabled: Boolean(taskId),
  });

  const createTimeLog = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetchJson<{ time_log: TimeLog }>("/api/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, ...body }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-logs", taskId] });
    },
  });

  return { ...query, createTimeLog };
}

export function useTaskCustomColumns(projectId: string | null | undefined) {
  const params = new URLSearchParams();
  if (projectId) {
    params.set("project_id", projectId);
  } else {
    params.set("standalone", "true");
  }

  return useQuery({
    queryKey: ["custom-columns", projectId ?? "standalone"],
    queryFn: () =>
      fetchJson<{ columns: CustomColumn[] }>(
        `/api/columns?${params.toString()}`,
      ).then((data) => data.columns.filter((column) => column.is_visible)),
    enabled: true,
  });
}

export function useUpdateTask(taskId: string | null) {
  const queryClient = useQueryClient();
  const mutationToast = useMutationToast();

  return useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      fetchJson<{ task: TaskWithMeta }>(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then((data) => data.task),
    onSuccess: (task) => {
      queryClient.setQueryData(["task", taskId], task);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      mutationToast.saved();
    },
    onError: (error) => {
      mutationToast.error(error, "Failed to save task");
    },
  });
}
