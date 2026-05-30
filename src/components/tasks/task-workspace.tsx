"use client";

import { useEffect, useMemo, useState } from "react";

import type { DraftTaskValues } from "@/components/tasks/table/draft-task-row";
import { TasksTableSkeleton } from "@/components/tasks/table/tasks-table-skeleton";
import { TasksTableView } from "@/components/tasks/table/tasks-table-view";
import { TaskToolbar } from "@/components/tasks/toolbar/task-toolbar";
import { TasksCalendarView } from "@/components/tasks/calendar/tasks-calendar-view";
import { TasksKanbanView } from "@/components/tasks/kanban/tasks-kanban-view";
import { TasksTimelineView } from "@/components/tasks/timeline/tasks-timeline-view";
import { TaskViewEmptyState } from "@/components/tasks/views/task-view-empty-state";
import { TaskViewPlaceholder } from "@/components/tasks/views/task-view-placeholder";
import { TaskViewSkeleton } from "@/components/tasks/views/task-view-skeleton";
import { AppPageHeader } from "@/components/layout/app-sidebar";
import { useCustomColumns } from "@/hooks/use-custom-columns";
import { useMutationToast } from "@/hooks/use-mutation-toast";
import { useOrgClients, useOrgMembers } from "@/hooks/use-org-data";
import { useTaskKeyboardShortcuts } from "@/hooks/use-task-keyboard-shortcuts";
import { useTasksRealtime } from "@/hooks/use-tasks-realtime";
import { useTasks } from "@/hooks/use-tasks";
import { useViewPreferences } from "@/hooks/use-view-preferences";
import { buildTableColumnDefinitions } from "@/lib/custom-columns/merge-columns";
import {
  applyTaskPipeline,
  type SortLevel,
} from "@/lib/tasks/client-filter";
import { loadColumnLayout } from "@/lib/tasks/column-definitions";
import { createEmptyDraft } from "@/lib/tasks/draft";
import { buildTableGroups, getDefaultDraftGroupKey } from "@/lib/tasks/table-groups";

interface TaskWorkspaceProps {
  orgId: string;
  title: string;
  description?: string;
  projectId?: string | null;
  mine?: boolean;
  emptyHint?: string;
  currentUserId?: string;
  /** Hide the page title block when a project header is shown above. */
  hidePageHeader?: boolean;
}

export function TaskWorkspace({
  orgId,
  title,
  description,
  projectId,
  mine = false,
  emptyHint = "Press Add task or press N to create your first task.",
  currentUserId,
  hidePageHeader = false,
}: TaskWorkspaceProps) {
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [activeDraftGroup, setActiveDraftGroup] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<DraftTaskValues | null>(null);
  const mutationToast = useMutationToast();

  const {
    preferences,
    setViewMode,
    setGroupBy,
    setSortConfig,
    setFilters,
    setHiddenColumns,
    setKanbanConfig,
    setCalendarConfig,
    setTimelineConfig,
    isLoading: preferencesLoading,
  } = useViewPreferences(projectId);

  const tasksOptions = {
    projectId,
    mine,
    includeArchived,
  };

  const {
    tasks,
    isLoading,
    isError,
    error,
    createTask,
    updateTask,
    invalidate: invalidateTasks,
  } = useTasks(tasksOptions);

  const { data: members = [] } = useOrgMembers();
  const { data: clients = [] } = useOrgClients();

  const {
    data: customColumns = [],
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
  } = useCustomColumns(projectId);

  useTasksRealtime({
    orgId,
    projectId,
    mine,
    includeArchived,
    enabled: true,
  });

  useEffect(() => {
    if (isError) {
      mutationToast.error(
        error,
        "Failed to load tasks. Check your connection and try again.",
      );
    }
  }, [isError, error, mutationToast]);

  const processedTasks = useMemo(
    () =>
      applyTaskPipeline(tasks, {
        search,
        filters: preferences.filters,
        sortConfig: preferences.sort_config,
      }),
    [tasks, search, preferences.filters, preferences.sort_config],
  );

  const tableGroups = useMemo(
    () => buildTableGroups(processedTasks, preferences.group_by),
    [processedTasks, preferences.group_by],
  );

  const visibleColumns = useMemo(
    () =>
      buildTableColumnDefinitions(
        preferences.hidden_columns,
        loadColumnLayout(projectId),
        customColumns,
      ),
    [preferences.hidden_columns, projectId, customColumns],
  );

  function handleSortColumn(columnId: string) {
    const existing = preferences.sort_config.find(
      (level) => level.column === columnId,
    );

    let next: SortLevel[];

    if (!existing) {
      next = [...preferences.sort_config, { column: columnId, direction: "asc" }];
    } else if (existing.direction === "asc") {
      next = preferences.sort_config.map((level) =>
        level.column === columnId ? { ...level, direction: "desc" } : level,
      );
    } else {
      next = preferences.sort_config.filter(
        (level) => level.column !== columnId,
      );
    }

    setSortConfig(next);
  }

  function handleStartDraft(groupKey?: string) {
    const key =
      groupKey ?? getDefaultDraftGroupKey(tableGroups, preferences.group_by);
    setActiveDraftGroup(key);
    setDraftValues(createEmptyDraft(key, preferences.group_by));
  }

  function handleDraftClear() {
    setActiveDraftGroup(null);
    setDraftValues(null);
  }

  function handleClearFilters() {
    setSearch("");
    setFilters([]);
  }

  useTaskKeyboardShortcuts({
    viewMode: preferences.view_mode,
    search,
    onNewTask: () => handleStartDraft(),
    onClearSearch: () => setSearch(""),
    onCancelDraft: handleDraftClear,
    hasActiveDraft: activeDraftGroup !== null,
    enabled: !isLoading && !preferencesLoading,
  });

  const showFilteredEmpty =
    processedTasks.length === 0 &&
    (search.length > 0 || preferences.filters.length > 0);

  const showListEmpty =
    processedTasks.length === 0 && !showFilteredEmpty && !activeDraftGroup;

  const sharedEmptyProps = {
    variant: (showFilteredEmpty ? "filtered" : "no-tasks") as
      | "filtered"
      | "no-tasks",
    hint: emptyHint,
    onAddTask: () => handleStartDraft(),
    onClearFilters: handleClearFilters,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {hidePageHeader ? null : (
        <AppPageHeader title={title} description={description} />
      )}

      <TaskToolbar
        search={search}
        onSearchChange={setSearch}
        includeArchived={includeArchived}
        onIncludeArchivedChange={setIncludeArchived}
        preferences={preferences}
        onViewModeChange={setViewMode}
        onGroupByChange={setGroupBy}
        onSortConfigChange={setSortConfig}
        onFiltersChange={setFilters}
        onHiddenColumnsChange={setHiddenColumns}
        onAddTask={() => handleStartDraft()}
        isCreating={createTask.isPending}
        projectId={projectId}
        exportTasks={processedTasks}
        visibleColumns={visibleColumns}
        members={members}
        clients={clients}
        onImportSuccess={() => {
          void invalidateTasks();
        }}
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-x-auto px-4 py-6 sm:px-6">
        {isLoading || preferencesLoading ? (
          preferences.view_mode === "table" ? (
            <TasksTableSkeleton columns={visibleColumns} />
          ) : (
            <TaskViewSkeleton viewMode={preferences.view_mode} />
          )
        ) : isError ? (
          <TaskViewEmptyState
            variant="no-tasks"
            title="Could not load tasks"
            description={
              error instanceof Error ? error.message : "Failed to load tasks"
            }
            onAddTask={() => void invalidateTasks()}
          />
        ) : preferences.view_mode === "timeline" ? (
          showFilteredEmpty ? (
            <TaskViewEmptyState
              {...sharedEmptyProps}
              viewMode="timeline"
              className="mb-4"
            />
          ) : showListEmpty ? (
            <TaskViewEmptyState
              {...sharedEmptyProps}
              viewMode="timeline"
              variant="view-specific"
              title="No scheduled tasks"
              description="Add start or due dates to tasks to see them on the timeline."
            />
          ) : (
            <TasksTimelineView
              tasks={processedTasks}
              timelineConfig={preferences.timeline_config}
              onTimelineConfigChange={setTimelineConfig}
              updateTask={(input) => updateTask.mutateAsync(input)}
              currentUserId={currentUserId}
            />
          )
        ) : preferences.view_mode === "calendar" ? (
          showFilteredEmpty ? (
            <TaskViewEmptyState
              {...sharedEmptyProps}
              viewMode="calendar"
            />
          ) : showListEmpty ? (
            <TaskViewEmptyState
              {...sharedEmptyProps}
              viewMode="calendar"
              variant="view-specific"
              title="No tasks on the calendar"
              description="Tasks with due dates appear here. Click a day to schedule work."
            />
          ) : (
            <TasksCalendarView
              tasks={processedTasks}
              projectId={projectId}
              calendarConfig={preferences.calendar_config}
              onCalendarConfigChange={setCalendarConfig}
              createTask={(input) => createTask.mutateAsync(input)}
              updateTask={(input) => updateTask.mutateAsync(input)}
              currentUserId={currentUserId}
              isCreating={createTask.isPending}
            />
          )
        ) : preferences.view_mode === "kanban" ? (
          <>
            {showFilteredEmpty ? (
              <TaskViewEmptyState
                {...sharedEmptyProps}
                viewMode="kanban"
                className="mb-4"
              />
            ) : null}
            {!showListEmpty ? (
              <TasksKanbanView
                tasks={processedTasks}
                preferences={preferences}
                projectId={projectId}
                customColumns={customColumns}
                kanbanConfig={preferences.kanban_config}
                onKanbanConfigChange={setKanbanConfig}
                createTask={(input) => createTask.mutateAsync(input)}
                updateTask={(input) => updateTask.mutateAsync(input)}
                currentUserId={currentUserId}
                isCreating={createTask.isPending}
              />
            ) : null}
            {showListEmpty ? (
              <TaskViewEmptyState {...sharedEmptyProps} viewMode="kanban" />
            ) : null}
          </>
        ) : preferences.view_mode === "table" ? (
          <>
            {showFilteredEmpty ? (
              <TaskViewEmptyState
                {...sharedEmptyProps}
                viewMode="table"
                className="mb-4"
              />
            ) : null}
            {!showListEmpty || activeDraftGroup ? (
              <div className="overflow-x-auto">
                <TasksTableView
                  tasks={processedTasks}
                  columns={visibleColumns}
                  preferences={preferences}
                  onSortColumn={handleSortColumn}
                  projectId={projectId}
                  createTask={(input) => createTask.mutateAsync(input)}
                  updateTask={(input) => updateTask.mutateAsync(input)}
                  activeDraftGroup={activeDraftGroup}
                  draftValues={draftValues}
                  onDraftChange={setDraftValues}
                  onDraftClear={handleDraftClear}
                  onStartDraftInGroup={handleStartDraft}
                  currentUserId={currentUserId}
                  customColumnsData={customColumns}
                  customColumnCount={customColumns.length}
                  onCreateColumn={async (input) => {
                    await createColumn.mutateAsync(input);
                  }}
                  onUpdateColumn={async (id, patch) => {
                    await updateColumn.mutateAsync({ id, patch });
                  }}
                  onDeleteColumn={async (id) => {
                    await deleteColumn.mutateAsync(id);
                  }}
                  onReorderCustomColumns={(orderedIds) =>
                    reorderColumns.mutate(orderedIds)
                  }
                  isCreatingColumn={createColumn.isPending}
                  isUpdatingColumn={updateColumn.isPending}
                />
              </div>
            ) : null}
            {showListEmpty ? (
              <TaskViewEmptyState {...sharedEmptyProps} viewMode="table" />
            ) : null}
          </>
        ) : (
          <TaskViewPlaceholder
            viewMode={preferences.view_mode}
            taskCount={processedTasks.length}
            onAddTask={() => handleStartDraft()}
          />
        )}
      </div>
    </div>
  );
}
