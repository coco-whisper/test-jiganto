import type { ColumnConfig } from "./types";

export function formatNumberValue(
  value: number,
  config?: ColumnConfig,
): string {
  const format = config?.format ?? "decimal";
  let formatted: string;

  switch (format) {
    case "integer":
      formatted = Math.round(value).toLocaleString();
      break;
    case "currency":
      formatted = value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      break;
    case "percentage":
      formatted = `${value.toLocaleString(undefined, {
        maximumFractionDigits: 1,
      })}%`;
      break;
    default:
      formatted = value.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      });
  }

  const prefix = config?.prefix ?? "";
  const suffix = config?.suffix ?? "";
  return `${prefix}${formatted}${suffix}`;
}

export function isValidUrl(value: string) {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function normalizeUrl(value: string) {
  return value.startsWith("http") ? value : `https://${value}`;
}
