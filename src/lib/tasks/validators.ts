import { z } from "zod";

const taskStatusSchema = z.enum([
  "new",
  "in_progress",
  "pending",
  "delayed",
  "completed",
  "cancelled",
]);

const taskPrioritySchema = z.enum(["high", "medium", "low"]);

const customFieldTypeSchema = z.enum([
  "text",
  "longtext",
  "number",
  "date",
  "checkbox",
  "select",
  "multi_select",
  "person",
  "rating",
  "url",
]);

const viewModeSchema = z.enum([
  "table",
  "kanban",
  "timeline",
  "calendar",
  "board",
]);

const columnOptionSchema = z.object({
  label: z.string().trim().min(1).max(100),
  color: z.string().trim().min(1).max(32),
});

const columnConfigSchema = z
  .object({
    prefix: z.string().max(10).optional(),
    suffix: z.string().max(10).optional(),
    format: z.enum(["integer", "decimal", "currency", "percentage"]).optional(),
    includeTime: z.boolean().optional(),
    autoLink: z.boolean().optional(),
  })
  .optional();

export const createTaskSchema = z.object({
  name: z.string().trim().min(1, "Task name is required").max(255),
  project_id: z.string().uuid().nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.nullable().optional(),
  due_date: z.string().date().nullable().optional(),
  start_date: z.string().date().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  custom_data: z.record(z.string(), z.unknown()).optional(),
  member_ids: z.array(z.string().uuid()).optional(),
  position: z.number().optional(),
});

export const updateTaskSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    project_id: z.string().uuid().nullable().optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.nullable().optional(),
    due_date: z.string().date().nullable().optional(),
    start_date: z.string().date().nullable().optional(),
    client_id: z.string().uuid().nullable().optional(),
    description: z.string().nullable().optional(),
    progress: z.number().int().min(0).max(100).optional(),
    custom_data: z.record(z.string(), z.unknown()).optional(),
    member_ids: z.array(z.string().uuid()).optional(),
    is_archived: z.boolean().optional(),
    position: z.number().optional(),
    after_id: z.string().uuid().optional(),
    before_id: z.string().uuid().optional(),
  })
  .refine(
    (data) => !(data.after_id && data.before_id),
    "Provide either after_id or before_id for reordering, not both",
  );

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(255),
  status: taskStatusSchema.optional(),
  client_id: z.string().uuid().nullable().optional(),
  start_date: z.string().date().nullable().optional(),
  due_date: z.string().date().nullable().optional(),
});

export const createColumnSchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1, "Column name is required").max(100),
  field_type: customFieldTypeSchema,
  options: z.array(columnOptionSchema).optional(),
  config: columnConfigSchema,
  position: z.number().int().optional(),
  is_visible: z.boolean().optional(),
});

export const updateColumnSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  options: z.array(columnOptionSchema).optional(),
  config: columnConfigSchema,
  position: z.number().int().optional(),
  is_visible: z.boolean().optional(),
});

export const createSubTaskSchema = z.object({
  task_id: z.string().uuid(),
  name: z.string().trim().min(1, "Sub-task name is required").max(255),
  assignee_id: z.string().uuid().nullable().optional(),
  is_done: z.boolean().optional(),
  position: z.number().optional(),
});

export const updateSubTaskSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  is_done: z.boolean().optional(),
  position: z.number().optional(),
});

export const createCommentSchema = z.object({
  task_id: z.string().uuid(),
  body: z.string().trim().min(1, "Comment body is required"),
  parent_id: z.string().uuid().nullable().optional(),
});

export const updateCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment body is required"),
});

export const createTimeLogSchema = z
  .object({
    task_id: z.string().uuid(),
    duration_mins: z.number().int().min(0).optional(),
    description: z.string().nullable().optional(),
    started_at: z.string().datetime().nullable().optional(),
    ended_at: z.string().datetime().nullable().optional(),
    stop_timer: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.stop_timer === true ||
      data.duration_mins !== undefined ||
      (data.started_at !== undefined && data.started_at !== null),
    "Provide duration_mins, started_at, or stop_timer",
  );

const kanbanConfigSchema = z
  .object({
    wip_limits: z.record(z.string(), z.number().int().positive()).optional(),
  })
  .optional();

const calendarConfigSchema = z
  .object({
    sub_view: z.enum(["month", "week"]).optional(),
    focus_date: z.string().date().optional(),
  })
  .optional();

const timelineConfigSchema = z
  .object({
    zoom: z.enum(["week", "month", "quarter"]).optional(),
    show_unscheduled: z.boolean().optional(),
  })
  .optional();

const importTaskRowSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(255),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.nullable().optional(),
  due_date: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  client_name: z.string().nullable().optional(),
  member_emails: z.array(z.string().trim().min(1)).optional(),
  description: z.string().nullable().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  is_archived: z.boolean().optional(),
  custom_data: z.record(z.string(), z.unknown()).optional(),
});

export const importTasksSchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  standalone: z.boolean().optional(),
  mode: z.enum(["append", "overwrite"]),
  rows: z.array(importTaskRowSchema).min(1).max(2000),
});

export const updateViewPreferencesSchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  view_mode: viewModeSchema.optional(),
  group_by: z.string().trim().min(1).max(100).optional(),
  sort_config: z.array(z.record(z.string(), z.unknown())).optional(),
  hidden_columns: z.array(z.string()).optional(),
  filters: z.array(z.record(z.string(), z.unknown())).optional(),
  kanban_config: kanbanConfigSchema,
  calendar_config: calendarConfigSchema,
  timeline_config: timelineConfigSchema,
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
export type CreateSubTaskInput = z.infer<typeof createSubTaskSchema>;
export type UpdateSubTaskInput = z.infer<typeof updateSubTaskSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CreateTimeLogInput = z.infer<typeof createTimeLogSchema>;
export type UpdateViewPreferencesInput = z.infer<
  typeof updateViewPreferencesSchema
>;
export type ImportTasksInput = z.infer<typeof importTasksSchema>;
