import type { TaskStatus } from "@/lib/database.types";

export const TASK_STATUSES: TaskStatus[] = [
  "new",
  "in_progress",
  "pending",
  "delayed",
  "completed",
  "cancelled",
];

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; color: string; bgColor: string }
> = {
  new: { label: "New", color: "#3b82f6", bgColor: "#eff6ff" },
  in_progress: { label: "In Progress", color: "#059669", bgColor: "#d1fae5" },
  pending: { label: "Pending", color: "#d97706", bgColor: "#fef3c7" },
  delayed: { label: "Delayed", color: "#dc2626", bgColor: "#fee2e2" },
  completed: { label: "Completed", color: "#7c3aed", bgColor: "#ede9fe" },
  cancelled: { label: "Cancelled", color: "#64748b", bgColor: "#f1f5f9" },
};

export const MAX_CUSTOM_COLUMNS = 10;
export const ARCHIVE_COMPLETED_AFTER_DAYS = 7;
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
