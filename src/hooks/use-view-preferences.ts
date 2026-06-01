"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { Json, ViewMode } from "@/lib/database.types";
import {
  DEFAULT_VIEW_PREFERENCES,
  parseFilters,
  parseHiddenColumns,
  parseSortConfig,
  type SortLevel,
  type TaskFilter,
  type ViewPreferencesState,
} from "@/lib/tasks/client-filter";
import { parseCalendarConfig } from "@/lib/tasks/calendar-config";
import { parseKanbanConfig } from "@/lib/tasks/kanban-config";
import { parseTimelineConfig } from "@/lib/tasks/timeline-config";

function buildPreferencesUrl(projectId?: string | null): string {
  const params = new URLSearchParams();

  if (projectId) {
    params.set("project_id", projectId);
  }

  return `/api/view-preferences?${params.toString()}`;
}

export function viewPreferencesQueryKey(projectId?: string | null) {
  return ["view-preferences", projectId ?? null] as const;
}

function normalizePreferences(data: {
  view_mode?: ViewMode;
  group_by?: string;
  sort_config?: Json;
  hidden_columns?: Json;
  filters?: Json;
  kanban_config?: Json;
  calendar_config?: Json;
  timeline_config?: Json;
}): ViewPreferencesState {
  const groupBy = data.group_by ?? DEFAULT_VIEW_PREFERENCES.group_by;

  return {
    view_mode: data.view_mode ?? DEFAULT_VIEW_PREFERENCES.view_mode,
    group_by: groupBy === "none" ? null : groupBy,
    sort_config: parseSortConfig(data.sort_config),
    hidden_columns: parseHiddenColumns(data.hidden_columns),
    filters: parseFilters(data.filters),
    kanban_config: parseKanbanConfig(data.kanban_config),
    calendar_config: parseCalendarConfig(data.calendar_config),
    timeline_config: parseTimelineConfig(data.timeline_config),
  };
}

async function fetchViewPreferences(
  projectId?: string | null,
): Promise<ViewPreferencesState> {
  const response = await fetch(buildPreferencesUrl(projectId));

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to load view preferences");
  }

  const payload = await response.json();
  return normalizePreferences(payload.preferences ?? {});
}

async function patchViewPreferences(
  projectId: string | null | undefined,
  patch: Partial<ViewPreferencesState>,
) {
  const response = await fetch(buildPreferencesUrl(projectId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: projectId ?? null,
      view_mode: patch.view_mode,
      group_by: patch.group_by ?? "none",
      sort_config: patch.sort_config as unknown as Json,
      hidden_columns: patch.hidden_columns as unknown as Json,
      filters: patch.filters as unknown as Json,
      kanban_config: patch.kanban_config as unknown as Json,
      calendar_config: patch.calendar_config as unknown as Json,
      timeline_config: patch.timeline_config as unknown as Json,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to save view preferences");
  }

  return normalizePreferences(payload.preferences ?? {});
}

export function useViewPreferences(projectId?: string | null) {
  const queryClient = useQueryClient();
  const queryKey = viewPreferencesQueryKey(projectId);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchViewPreferences(projectId),
  });

  const savePreferences = useMutation({
    mutationFn: (patch: Partial<ViewPreferencesState>) =>
      patchViewPreferences(projectId, {
        ...query.data,
        ...patch,
      }),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ViewPreferencesState>(queryKey);
      const next = { ...(previous ?? DEFAULT_VIEW_PREFERENCES), ...patch };
      queryClient.setQueryData(queryKey, next);
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const preferences = query.data ?? DEFAULT_VIEW_PREFERENCES;

  return {
    preferences,
    isLoading: query.isLoading,
    savePreferences,
    setViewMode: (view_mode: ViewMode) => savePreferences.mutate({ view_mode }),
    setGroupBy: (group_by: string | null) =>
      savePreferences.mutate({ group_by }),
    setSortConfig: (sort_config: SortLevel[]) =>
      savePreferences.mutate({ sort_config }),
    setHiddenColumns: (hidden_columns: string[]) =>
      savePreferences.mutate({ hidden_columns }),
    setFilters: (filters: TaskFilter[]) => savePreferences.mutate({ filters }),
    setKanbanConfig: (kanban_config: ViewPreferencesState["kanban_config"]) =>
      savePreferences.mutate({ kanban_config }),
    setCalendarConfig: (
      calendar_config: ViewPreferencesState["calendar_config"],
    ) => savePreferences.mutate({ calendar_config }),
    setTimelineConfig: (
      timeline_config: ViewPreferencesState["timeline_config"],
    ) => savePreferences.mutate({ timeline_config }),
    addFilter: (filter: TaskFilter) =>
      savePreferences.mutate({
        filters: [...preferences.filters, filter],
      }),
    removeFilter: (filterId: string) =>
      savePreferences.mutate({
        filters: preferences.filters.filter((filter) => filter.id !== filterId),
      }),
  };
}
