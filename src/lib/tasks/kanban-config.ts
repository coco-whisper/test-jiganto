import type { Json } from "@/lib/database.types";

export interface KanbanConfig {
  wip_limits: Record<string, number>;
}

export const DEFAULT_KANBAN_CONFIG: KanbanConfig = {
  wip_limits: {},
};

export function parseKanbanConfig(value: Json | null | undefined): KanbanConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return DEFAULT_KANBAN_CONFIG;
  }

  const record = value as Record<string, Json | undefined>;
  const rawLimits = record.wip_limits;

  if (typeof rawLimits !== "object" || rawLimits === null || Array.isArray(rawLimits)) {
    return DEFAULT_KANBAN_CONFIG;
  }

  const wip_limits: Record<string, number> = {};
  for (const [key, limit] of Object.entries(rawLimits)) {
    const num = typeof limit === "number" ? limit : Number(limit);
    if (!Number.isNaN(num) && num > 0) {
      wip_limits[key] = Math.floor(num);
    }
  }

  return { wip_limits };
}
