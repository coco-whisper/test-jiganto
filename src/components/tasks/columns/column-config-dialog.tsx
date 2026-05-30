"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  defaultOptionsForType,
  getFieldTypeMeta,
  type ColumnConfig,
  type ColumnOption,
} from "@/lib/custom-columns/types";
import type { CustomFieldType } from "@/lib/database.types";

export interface ColumnConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  fieldType: CustomFieldType;
  initialName?: string;
  initialOptions?: ColumnOption[];
  initialConfig?: ColumnConfig;
  onSubmit: (data: {
    name: string;
    options?: ColumnOption[];
    config?: ColumnConfig;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const OPTION_COLORS = [
  "#3b82f6",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#64748b",
];

export function ColumnConfigDialog({
  open,
  onOpenChange,
  mode,
  fieldType,
  initialName = "",
  initialOptions,
  initialConfig,
  onSubmit,
  isSubmitting,
}: ColumnConfigDialogProps) {
  const meta = getFieldTypeMeta(fieldType);
  const [name, setName] = useState(initialName);
  const [options, setOptions] = useState<ColumnOption[]>(
    initialOptions?.length ? initialOptions : defaultOptionsForType(),
  );
  const [config, setConfig] = useState<ColumnConfig>(initialConfig ?? {});

  useEffect(() => {
    if (open) {
      setName(initialName);
      setOptions(
        initialOptions?.length ? initialOptions : defaultOptionsForType(),
      );
      setConfig(initialConfig ?? {});
    }
  }, [open, initialName, initialOptions, initialConfig]);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;

    await onSubmit({
      name: trimmed,
      ...(meta.needsOptions ? { options } : {}),
      config: {
        ...config,
        ...(meta.needsNumberFormat && config.format
          ? { format: config.format }
          : {}),
        ...(meta.needsDateTime ? { includeTime: config.includeTime } : {}),
        ...(fieldType === "text" ? { autoLink: config.autoLink } : {}),
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add" : "Edit"} {meta.label} column
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Column name</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={`e.g. ${meta.label}`}
              maxLength={100}
            />
          </div>

          {meta.needsOptions ? (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option.label}
                      onChange={(event) => {
                        const next = [...options];
                        next[index] = { ...option, label: event.target.value };
                        setOptions(next);
                      }}
                      placeholder="Label"
                      className="flex-1"
                    />
                    <Select
                      value={option.color}
                      onValueChange={(color) => {
                        const next = [...options];
                        next[index] = { ...option, color };
                        setOptions(next);
                      }}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPTION_COLORS.map((color) => (
                          <SelectItem key={color} value={color}>
                            <span
                              className="inline-block size-3 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={options.length <= 1}
                      onClick={() =>
                        setOptions(options.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  setOptions([
                    ...options,
                    {
                      label: `Option ${options.length + 1}`,
                      color: OPTION_COLORS[options.length % OPTION_COLORS.length],
                    },
                  ])
                }
              >
                <Plus className="size-3.5" />
                Add option
              </Button>
            </div>
          ) : null}

          {meta.needsNumberFormat ? (
            <div className="space-y-2">
              <Label>Number format</Label>
              <Select
                value={config.format ?? "decimal"}
                onValueChange={(value) =>
                  setConfig({
                    ...config,
                    format: value as ColumnConfig["format"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="integer">Integer</SelectItem>
                  <SelectItem value="decimal">Decimal</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Prefix</Label>
                  <Input
                    value={config.prefix ?? ""}
                    onChange={(event) =>
                      setConfig({ ...config, prefix: event.target.value })
                    }
                    placeholder="$"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Suffix</Label>
                  <Input
                    value={config.suffix ?? ""}
                    onChange={(event) =>
                      setConfig({ ...config, suffix: event.target.value })
                    }
                    placeholder="%"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {meta.needsDateTime ? (
            <div className="flex items-center justify-between">
              <Label htmlFor="include-time">Include time</Label>
              <Switch
                id="include-time"
                checked={config.includeTime ?? false}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, includeTime: checked })
                }
              />
            </div>
          ) : null}

          {fieldType === "text" ? (
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-link">Auto-link URLs</Label>
              <Switch
                id="auto-link"
                checked={config.autoLink ?? false}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, autoLink: checked })
                }
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            {mode === "create" ? "Add column" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
