import type { CustomFieldType, Json } from "@/lib/database.types";

export type CustomColumnRow = {
  id: string;
  name: string;
  field_type: CustomFieldType;
  options: Json;
  config: Json;
  position: number;
  is_visible: boolean;
};

export interface ColumnOption {
  label: string;
  color: string;
}

export interface ColumnConfig {
  prefix?: string;
  suffix?: string;
  format?: "integer" | "decimal" | "currency" | "percentage";
  includeTime?: boolean;
  autoLink?: boolean;
}

export interface FieldTypeMeta {
  type: CustomFieldType;
  label: string;
  description: string;
  icon: string;
  needsOptions: boolean;
  needsNumberFormat: boolean;
  needsDateTime: boolean;
}

export const FIELD_TYPE_CATALOG: FieldTypeMeta[] = [
  { type: "text", label: "Text", description: "Single line", icon: "Aa", needsOptions: false, needsNumberFormat: false, needsDateTime: false },
  { type: "longtext", label: "Long text", description: "Multi-line preview", icon: "¶", needsOptions: false, needsNumberFormat: false, needsDateTime: false },
  { type: "number", label: "Number", description: "Sum in footer", icon: "#", needsOptions: false, needsNumberFormat: true, needsDateTime: false },
  { type: "date", label: "Date", description: "Date or date+time", icon: "📅", needsOptions: false, needsNumberFormat: false, needsDateTime: true },
  { type: "checkbox", label: "Checkbox", description: "One-click toggle", icon: "☑", needsOptions: false, needsNumberFormat: false, needsDateTime: false },
  { type: "select", label: "Dropdown", description: "Colored badge", icon: "▼", needsOptions: true, needsNumberFormat: false, needsDateTime: false },
  { type: "multi_select", label: "Multi-select", description: "Stacked pills", icon: "▣", needsOptions: true, needsNumberFormat: false, needsDateTime: false },
  { type: "person", label: "Person", description: "Single assignee", icon: "👤", needsOptions: false, needsNumberFormat: false, needsDateTime: false },
  { type: "rating", label: "Rating", description: "1–5 stars", icon: "★", needsOptions: false, needsNumberFormat: false, needsDateTime: false },
  { type: "url", label: "URL", description: "Link + label", icon: "🔗", needsOptions: false, needsNumberFormat: false, needsDateTime: false },
];

export function getFieldTypeMeta(type: CustomFieldType): FieldTypeMeta {
  return FIELD_TYPE_CATALOG.find((item) => item.type === type) ?? FIELD_TYPE_CATALOG[0];
}

export function parseColumnOptions(options: Json | null | undefined): ColumnOption[] {
  if (!Array.isArray(options)) return [];
  return options
    .filter(
      (item): item is Record<string, Json | undefined> =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    )
    .map((item) => ({
      label: String(item.label ?? ""),
      color: String(item.color ?? "#6366f1"),
    }))
    .filter((item) => item.label.length > 0);
}

export function parseColumnConfig(config: Json | null | undefined): ColumnConfig {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    return {};
  }
  const record = config as Record<string, Json | undefined>;
  const format = record.format;
  return {
    prefix: record.prefix != null ? String(record.prefix) : undefined,
    suffix: record.suffix != null ? String(record.suffix) : undefined,
    format:
      format === "integer" ||
      format === "decimal" ||
      format === "currency" ||
      format === "percentage"
        ? format
        : undefined,
    includeTime: record.includeTime === true,
    autoLink: record.autoLink === true,
  };
}

export function customColumnToDefinition(column: CustomColumnRow) {
  return {
    id: column.id,
    label: column.name,
    defaultVisible: column.is_visible,
    sortable: true,
    filterable: true,
    isCustom: true as const,
    fieldType: column.field_type,
    options: parseColumnOptions(column.options),
    config: parseColumnConfig(column.config),
  };
}

export function getTaskCustomData(
  task: { custom_data: Json },
): Record<string, Json> {
  const data = task.custom_data;
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    return data as Record<string, Json>;
  }
  return {};
}

export function defaultOptionsForType(): ColumnOption[] {
  return [
    { label: "Option 1", color: "#3b82f6" },
    { label: "Option 2", color: "#059669" },
    { label: "Option 3", color: "#d97706" },
  ];
}
