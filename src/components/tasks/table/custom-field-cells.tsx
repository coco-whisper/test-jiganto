"use client";

import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { AlertTriangle, ExternalLink, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import type { OrgMember } from "@/hooks/use-org-data";
import {
  formatNumberValue,
  isValidUrl,
  normalizeUrl,
} from "@/lib/custom-columns/format";
import {
  getTaskCustomData,
  type ColumnConfig,
} from "@/lib/custom-columns/types";
import type { ColumnDefinition, TaskWithMeta } from "@/lib/tasks/client-filter";
import type { Json } from "@/lib/database.types";
import { cn } from "@/lib/utils";

interface CustomCellContext {
  task: TaskWithMeta;
  column: ColumnDefinition;
  onPatch: (patch: Record<string, unknown>) => void;
  members: OrgMember[];
  onExpand?: () => void;
}

function patchCustomValue(
  task: TaskWithMeta,
  columnId: string,
  value: Json,
  onPatch: (patch: Record<string, unknown>) => void,
) {
  onPatch({
    custom_data: { ...getTaskCustomData(task), [columnId]: value },
  });
}

function memberInitials(member: OrgMember) {
  const name = member.display_name ?? member.email;
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TextFieldCell({ task, column, onPatch }: CustomCellContext) {
  const value = String(getTaskCustomData(task)[column.id] ?? "");
  const [draft, setDraft] = useState(value);
  const autoLink = column.config?.autoLink;

  useEffect(() => setDraft(value), [value]);

  if (autoLink && value && isValidUrl(value)) {
    return (
      <a
        href={normalizeUrl(value)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary underline"
      >
        {value}
      </a>
    );
  }

  return (
    <Input
      value={draft}
      maxLength={255}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const trimmed = draft.trim().slice(0, 255);
        if (trimmed !== value) patchCustomValue(task, column.id, trimmed, onPatch);
        else setDraft(value);
      }}
      className="h-8 min-w-[120px] border-transparent bg-transparent shadow-none focus-visible:border-input focus-visible:bg-background"
    />
  );
}

function LongTextFieldCell({ task, column, onExpand }: CustomCellContext) {
  const value = String(getTaskCustomData(task)[column.id] ?? "");
  const preview =
    value.length > 80 ? `${value.slice(0, 80)}…` : value || "—";

  return (
    <button
      type="button"
      className="max-w-[200px] truncate text-left text-sm text-muted-foreground hover:text-foreground"
      onClick={onExpand}
      title={value || "Edit in task panel"}
    >
      {preview}
    </button>
  );
}

function NumberFieldCell({ task, column, onPatch }: CustomCellContext) {
  const raw = getTaskCustomData(task)[column.id];
  const num =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw !== ""
        ? Number.parseFloat(raw)
        : null;
  const [draft, setDraft] = useState(num != null ? String(num) : "");

  useEffect(() => {
    setDraft(num != null ? String(num) : "");
  }, [num]);

  return (
    <Input
      type="number"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const parsed = draft === "" ? null : Number.parseFloat(draft);
        if (parsed === null || !Number.isNaN(parsed)) {
          patchCustomValue(task, column.id, parsed, onPatch);
        } else {
          setDraft(num != null ? String(num) : "");
        }
      }}
      className="h-8 w-[100px] border-transparent bg-transparent tabular-nums shadow-none focus-visible:border-input focus-visible:bg-background"
      placeholder="—"
    />
  );
}

export function formatNumberDisplay(
  value: number | null,
  config?: ColumnConfig,
) {
  if (value == null || Number.isNaN(value)) return "—";
  return formatNumberValue(value, config);
}

function DateFieldCell({ task, column, onPatch }: CustomCellContext) {
  const raw = getTaskCustomData(task)[column.id];
  const str = raw != null ? String(raw) : "";
  const includeTime = column.config?.includeTime;
  const date = str ? parseISO(str) : undefined;
  const isOverdue =
    date &&
    !includeTime &&
    isBefore(date, startOfDay(new Date())) &&
    task.status !== "completed";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "font-mono text-xs",
            isOverdue ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {str
            ? format(date!, includeTime ? "yyyy-MM-dd HH:mm" : "yyyy-MM-dd")
            : "Set date"}
          {isOverdue ? <AlertTriangle className="ml-1 inline size-3" /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selected) => {
            if (!selected) {
              patchCustomValue(task, column.id, null, onPatch);
              return;
            }
            const iso = includeTime
              ? `${format(selected, "yyyy-MM-dd")}T12:00:00.000Z`
              : format(selected, "yyyy-MM-dd");
            patchCustomValue(task, column.id, iso, onPatch);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function CheckboxFieldCell({ task, column, onPatch }: CustomCellContext) {
  const checked = Boolean(getTaskCustomData(task)[column.id]);

  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(value) =>
        patchCustomValue(task, column.id, Boolean(value), onPatch)
      }
    />
  );
}

function SelectFieldCell({ task, column, onPatch }: CustomCellContext) {
  const options = column.options ?? [];
  const value = String(getTaskCustomData(task)[column.id] ?? "");
  const selected = options.find((option) => option.label === value);

  return (
    <Select
      value={value || "none"}
      onValueChange={(next) =>
        patchCustomValue(
          task,
          column.id,
          next === "none" ? null : next,
          onPatch,
        )
      }
    >
      <SelectTrigger
        className="h-8 min-w-[7.5rem] w-max border-transparent bg-transparent shadow-none"
        style={
          selected
            ? { color: selected.color, backgroundColor: `${selected.color}18` }
            : undefined
        }
      >
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">—</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.label} value={option.label}>
            <span
              className="mr-2 inline-block size-2 rounded-full"
              style={{ backgroundColor: option.color }}
            />
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MultiSelectFieldCell({ task, column, onPatch }: CustomCellContext) {
  const options = column.options ?? [];
  const raw = getTaskCustomData(task)[column.id];
  const selected = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string")
    : [];

  function toggle(label: string) {
    const next = new Set(selected);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    patchCustomValue(task, column.id, Array.from(next), onPatch);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="flex max-w-[180px] flex-wrap gap-1">
          {selected.length === 0 ? (
            <span className="text-xs text-muted-foreground">Select</span>
          ) : (
            selected.map((label) => {
              const option = options.find((item) => item.label === label);
              return (
                <span
                  key={label}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    color: option?.color ?? "#64748b",
                    backgroundColor: `${option?.color ?? "#64748b"}22`,
                  }}
                >
                  {label}
                </span>
              );
            })
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
              selected.includes(option.label) && "bg-muted",
            )}
            onClick={() => toggle(option.label)}
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: option.color }}
            />
            {option.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function PersonFieldCell({ task, column, onPatch, members }: CustomCellContext) {
  const userId = getTaskCustomData(task)[column.id];
  const id = typeof userId === "string" ? userId : null;
  const member = members.find((item) => item.id === id);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="flex items-center gap-2">
          {member ? (
            <>
              <Avatar className="size-6">
                <AvatarFallback className="text-[9px]">
                  {memberInitials(member)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">
                {member.display_name ?? member.email.split("@")[0]}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Assign</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <button
          type="button"
          className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
          onClick={() => patchCustomValue(task, column.id, null, onPatch)}
        >
          Unassigned
        </button>
        {members.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
              id === item.id && "bg-muted",
            )}
            onClick={() => patchCustomValue(task, column.id, item.id, onPatch)}
          >
            <Avatar className="size-6">
              <AvatarFallback className="text-[9px]">
                {memberInitials(item)}
              </AvatarFallback>
            </Avatar>
            {item.display_name ?? item.email}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function RatingFieldCell({ task, column, onPatch }: CustomCellContext) {
  const raw = getTaskCustomData(task)[column.id];
  const rating =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : 0;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() =>
            patchCustomValue(
              task,
              column.id,
              rating === star ? 0 : star,
              onPatch,
            )
          }
        >
          <Star
            className={cn(
              "size-4",
              star <= rating
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}

function UrlFieldCell({ task, column, onPatch }: CustomCellContext) {
  const raw = getTaskCustomData(task)[column.id];
  const parsed =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as { url?: string; label?: string })
      : { url: typeof raw === "string" ? raw : "", label: "" };
  const [urlDraft, setUrlDraft] = useState(parsed.url ?? "");
  const [labelDraft, setLabelDraft] = useState(parsed.label ?? "");

  useEffect(() => {
    setUrlDraft(parsed.url ?? "");
    setLabelDraft(parsed.label ?? "");
  }, [parsed.url, parsed.label]);

  function save() {
    const url = urlDraft.trim();
    if (!url) {
      patchCustomValue(task, column.id, null, onPatch);
      return;
    }
    if (!isValidUrl(url)) return;
    patchCustomValue(
      task,
      column.id,
      { url: normalizeUrl(url), label: labelDraft.trim() || null },
      onPatch,
    );
  }

  const displayUrl = parsed.url;
  const valid = displayUrl && isValidUrl(displayUrl);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {valid ? (
          <a
            href={normalizeUrl(displayUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary underline"
            onClick={(event) => event.stopPropagation()}
          >
            {parsed.label || displayUrl}
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">Add URL</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2 p-3" align="start">
        <Input
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
          placeholder="https://..."
        />
        <Input
          value={labelDraft}
          onChange={(event) => setLabelDraft(event.target.value)}
          placeholder="Label (optional)"
        />
        <Button size="sm" className="w-full" onClick={save}>
          Save
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function renderCustomFieldCell(context: CustomCellContext) {
  const type = context.column.fieldType;

  switch (type) {
    case "text":
      return <TextFieldCell {...context} />;
    case "longtext":
      return <LongTextFieldCell {...context} />;
    case "number":
      return <NumberFieldCell {...context} />;
    case "date":
      return <DateFieldCell {...context} />;
    case "checkbox":
      return <CheckboxFieldCell {...context} />;
    case "select":
      return <SelectFieldCell {...context} />;
    case "multi_select":
      return <MultiSelectFieldCell {...context} />;
    case "person":
      return <PersonFieldCell {...context} />;
    case "rating":
      return <RatingFieldCell {...context} />;
    case "url":
      return <UrlFieldCell {...context} />;
    default:
      return <span className="text-muted-foreground">—</span>;
  }
}

export function CustomFieldPanelEditor({
  task,
  column,
  onPatch,
  members,
}: CustomCellContext) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{column.label}</p>
      {column.fieldType === "longtext" ? (
        <textarea
          className="min-h-[80px] w-full rounded-md border px-2 py-1.5 text-sm"
          defaultValue={String(getTaskCustomData(task)[column.id] ?? "")}
          onBlur={(event) =>
            patchCustomValue(task, column.id, event.target.value, onPatch)
          }
        />
      ) : (
        renderCustomFieldCell({ task, column, onPatch, members })
      )}
    </div>
  );
}
