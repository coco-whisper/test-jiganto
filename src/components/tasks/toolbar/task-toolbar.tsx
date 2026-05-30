"use client";

import { Filter, Plus, Search, X } from "lucide-react";
import { useState } from "react";

import { EditViewSheet } from "@/components/tasks/toolbar/edit-view-sheet";
import { ImportExportMenu } from "@/components/tasks/toolbar/import-export-menu";
import type { OrgClient, OrgMember } from "@/hooks/use-org-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ViewMode } from "@/lib/database.types";
import type {
  ColumnDefinition,
  FilterOperator,
  SortLevel,
  TaskFilter,
  TaskWithMeta,
  ViewPreferencesState,
} from "@/lib/tasks/client-filter";
import {
  FILTERABLE_COLUMNS,
  GROUPABLE_COLUMNS,
  SORTABLE_COLUMNS,
  VIEW_MODE_OPTIONS,
} from "@/lib/tasks/column-definitions";
import { TASK_STATUS_META } from "@/lib/tasks/constants";

interface TaskToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  includeArchived: boolean;
  onIncludeArchivedChange: (value: boolean) => void;
  preferences: ViewPreferencesState;
  onViewModeChange: (mode: ViewMode) => void;
  onGroupByChange: (groupBy: string | null) => void;
  onSortConfigChange: (sortConfig: SortLevel[]) => void;
  onFiltersChange: (filters: TaskFilter[]) => void;
  onHiddenColumnsChange: (hiddenColumns: string[]) => void;
  onAddTask: () => void;
  isCreating?: boolean;
  projectId?: string | null;
  exportTasks?: TaskWithMeta[];
  visibleColumns?: ColumnDefinition[];
  members?: OrgMember[];
  clients?: OrgClient[];
  onImportSuccess?: () => void;
}

function FilterEditor({
  filters,
  onChange,
}: {
  filters: TaskFilter[];
  onChange: (filters: TaskFilter[]) => void;
}) {
  const [draft, setDraft] = useState<TaskFilter>({
    id: crypto.randomUUID(),
    column: FILTERABLE_COLUMNS[0]?.id ?? "name",
    operator: "contains",
    value: "",
  });

  function addFilter() {
    if (!draft.column) return;
    onChange([...filters, { ...draft, id: crypto.randomUUID() }]);
    setDraft({
      id: crypto.randomUUID(),
      column: draft.column,
      operator: "contains",
      value: "",
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Column</Label>
        <Select
          value={draft.column}
          onValueChange={(value) =>
            setDraft((current) => ({ ...current, column: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERABLE_COLUMNS.map((column) => (
              <SelectItem key={column.id} value={column.id}>
                {column.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Operator</Label>
        <Select
          value={draft.operator}
          onValueChange={(value) =>
            setDraft((current) => ({
              ...current,
              operator: value as FilterOperator,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals">Equals</SelectItem>
            <SelectItem value="not_equals">Not equals</SelectItem>
            <SelectItem value="contains">Contains</SelectItem>
            <SelectItem value="is_empty">Is empty</SelectItem>
            <SelectItem value="is_not_empty">Is not empty</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!["is_empty", "is_not_empty"].includes(draft.operator) ? (
        <div className="space-y-2">
          <Label>Value</Label>
          <Input
            value={draft.value ?? ""}
            onChange={(event) =>
              setDraft((current) => ({ ...current, value: event.target.value }))
            }
          />
        </div>
      ) : null}

      <Button size="sm" onClick={addFilter}>
        Add filter
      </Button>

      {filters.length > 0 ? (
        <div className="space-y-2 border-t pt-3">
          <Label>Active filters</Label>
          {filters.map((filter) => (
            <div
              key={filter.id}
              className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs"
            >
              <span>
                {filter.column} {filter.operator.replaceAll("_", " ")}{" "}
                {filter.value ? `"${filter.value}"` : ""}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() =>
                  onChange(filters.filter((item) => item.id !== filter.id))
                }
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TaskToolbar({
  search,
  onSearchChange,
  includeArchived,
  onIncludeArchivedChange,
  preferences,
  onViewModeChange,
  onGroupByChange,
  onSortConfigChange,
  onFiltersChange,
  onHiddenColumnsChange,
  onAddTask,
  isCreating,
  projectId,
  exportTasks = [],
  visibleColumns = [],
  members = [],
  clients = [],
  onImportSuccess,
}: TaskToolbarProps) {
  const [editViewOpen, setEditViewOpen] = useState(false);
  const activeView = VIEW_MODE_OPTIONS.find(
    (option) => option.value === preferences.view_mode,
  );

  function toggleSortColumn(columnId: string) {
    const existing = preferences.sort_config.find(
      (level) => level.column === columnId,
    );

    if (!existing) {
      onSortConfigChange([
        ...preferences.sort_config,
        { column: columnId, direction: "asc" },
      ]);
      return;
    }

    if (existing.direction === "asc") {
      onSortConfigChange(
        preferences.sort_config.map((level) =>
          level.column === columnId ? { ...level, direction: "desc" } : level,
        ),
      );
      return;
    }

    onSortConfigChange(
      preferences.sort_config.filter((level) => level.column !== columnId),
    );
  }

  const groupLabel =
    GROUPABLE_COLUMNS.find((column) => column.id === preferences.group_by)
      ?.label ?? preferences.group_by;

  return (
    <>
      <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 border-b bg-background px-4 py-3 shadow-sm">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search tasks..."
            className="pl-8 pr-8"
          />
          {search ? (
            <button
              type="button"
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              onClick={() => onSearchChange("")}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <span>{activeView?.icon ?? "⊞"}</span>
              {activeView?.label ?? "Table"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>View</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={preferences.view_mode}
              onValueChange={(value) => onViewModeChange(value as ViewMode)}
            >
              {VIEW_MODE_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  <span className="mr-2">{option.icon}</span>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="size-4" />
              Filter
              {preferences.filters.length > 0 ? (
                <Badge variant="secondary">{preferences.filters.length}</Badge>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            <FilterEditor
              filters={preferences.filters}
              onChange={onFiltersChange}
            />
          </PopoverContent>
        </Popover>

        {preferences.group_by ? (
          <Badge variant="secondary" className="gap-1 rounded-md px-2 py-1">
            <span
              className="size-2 rounded-full"
              style={{
                background:
                  TASK_STATUS_META.new.color,
              }}
            />
            Group: {groupLabel}
            <button type="button" onClick={() => onGroupByChange(null)}>
              <X className="size-3.5" />
            </button>
          </Badge>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Group
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Group by</DropdownMenuLabel>
            {GROUPABLE_COLUMNS.map((column) => (
              <DropdownMenuItem
                key={column.id}
                onClick={() => onGroupByChange(column.id)}
              >
                {column.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onGroupByChange(null)}>
              Clear grouping
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Order
              {preferences.sort_config.length > 0 ? (
                <Badge variant="secondary">
                  {preferences.sort_config.length}
                </Badge>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            {SORTABLE_COLUMNS.map((column) => {
              const active = preferences.sort_config.find(
                (level) => level.column === column.id,
              );

              return (
                <DropdownMenuItem
                  key={column.id}
                  onClick={() => toggleSortColumn(column.id)}
                >
                  {column.label}
                  {active ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {active.direction === "asc" ? "↑" : "↓"}
                    </span>
                  ) : null}
                </DropdownMenuItem>
              );
            })}
            {preferences.sort_config.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSortConfigChange([])}>
                  Clear sort
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2 rounded-md border px-2 py-1">
          <Switch
            id="archived-toggle"
            checked={includeArchived}
            onCheckedChange={onIncludeArchivedChange}
          />
          <Label htmlFor="archived-toggle" className="text-xs">
            Archived
          </Label>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditViewOpen(true)}
        >
          Edit view
        </Button>

        <ImportExportMenu
          tasks={exportTasks}
          visibleColumns={visibleColumns}
          members={members}
          clients={clients}
          projectId={projectId}
          onImportSuccess={onImportSuccess ?? (() => {})}
        />

        <div className="flex-1" />

        <Button size="sm" className="gap-2 bg-emerald-700 hover:bg-emerald-800 border-0 shadow-md hover:shadow-lg transition-all duration-300" onClick={onAddTask} disabled={isCreating}>
          <Plus className="size-4 group-hover:rotate-90 transition-transform" />
          Add task
        </Button>
      </div>

      {preferences.filters.length > 0 ? (
        <div className="flex w-full min-w-0 shrink-0 flex-wrap gap-2 border-b px-4 py-2">
          {preferences.filters.map((filter) => (
            <Badge key={filter.id} variant="outline" className="gap-1">
              {filter.column} {filter.operator.replaceAll("_", " ")}
              {filter.value ? `: ${filter.value}` : ""}
              <button
                type="button"
                onClick={() =>
                  onFiltersChange(
                    preferences.filters.filter((item) => item.id !== filter.id),
                  )
                }
              >
                <X className="size-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <EditViewSheet
        open={editViewOpen}
        onOpenChange={setEditViewOpen}
        projectId={projectId}
        hiddenColumns={preferences.hidden_columns}
        onSave={onHiddenColumnsChange}
      />
    </>
  );
}
