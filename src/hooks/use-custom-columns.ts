"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useMutationToast } from "@/hooks/use-mutation-toast";
import type { CustomColumn } from "@/hooks/use-task-detail-data";
import type { ColumnConfig, ColumnOption } from "@/lib/custom-columns/types";
import type { CustomFieldType } from "@/lib/database.types";

function columnsQueryKey(projectId?: string | null) {
  return ["custom-columns", projectId ?? "standalone"] as const;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed: ${url}`);
  }
  return payload as T;
}

export function useCustomColumns(projectId?: string | null) {
  const queryClient = useQueryClient();
  const queryKey = columnsQueryKey(projectId);
  const mutationToast = useMutationToast();

  const params = new URLSearchParams();
  if (projectId) {
    params.set("project_id", projectId);
  } else {
    params.set("standalone", "true");
  }

  const query = useQuery({
    queryKey,
    queryFn: () =>
      fetchJson<{ columns: CustomColumn[] }>(
        `/api/columns?${params.toString()}`,
      ).then((data) => data.columns),
  });

  const createColumn = useMutation({
    mutationFn: (input: {
      name: string;
      field_type: CustomFieldType;
      options?: ColumnOption[];
      config?: ColumnConfig;
      position?: number;
    }) =>
      fetchJson<{ column: CustomColumn }>("/api/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId ?? null,
          ...input,
        }),
      }).then((data) => data.column),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateColumn = useMutation({
    mutationFn: (input: {
      id: string;
      patch: {
        name?: string;
        options?: ColumnOption[];
        config?: ColumnConfig;
        position?: number;
        is_visible?: boolean;
      };
    }) =>
      fetchJson<{ column: CustomColumn }>(`/api/columns/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.patch),
      }).then((data) => data.column),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      mutationToast.saved("Column updated.");
    },
    onError: (error) => mutationToast.error(error, "Failed to update column"),
  });

  const deleteColumn = useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ success: boolean }>(`/api/columns/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      mutationToast.saved("Column removed.");
    },
    onError: (error) => mutationToast.error(error, "Failed to delete column"),
  });

  const reorderColumns = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, position) =>
          fetchJson<{ column: CustomColumn }>(`/api/columns/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position }),
          }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    ...query,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
  };
}
