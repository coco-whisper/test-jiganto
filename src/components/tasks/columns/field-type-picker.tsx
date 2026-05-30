"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { ColumnConfigDialog } from "@/components/tasks/columns/column-config-dialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FIELD_TYPE_CATALOG, type ColumnConfig } from "@/lib/custom-columns/types";
import type { CustomFieldType } from "@/lib/database.types";
import { MAX_CUSTOM_COLUMNS } from "@/lib/tasks/constants";
import { cn } from "@/lib/utils";

interface FieldTypePickerProps {
  customColumnCount: number;
  onCreateColumn: (input: {
    name: string;
    field_type: CustomFieldType;
    options?: { label: string; color: string }[];
    config?: ColumnConfig;
  }) => Promise<void>;
  isCreating?: boolean;
}

export function FieldTypePicker({
  customColumnCount,
  onCreateColumn,
  isCreating,
}: FieldTypePickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CustomFieldType | null>(null);
  const atLimit = customColumnCount >= MAX_CUSTOM_COLUMNS;

  function handleTypeSelect(type: CustomFieldType) {
    setSelectedType(type);
    setPickerOpen(false);
    setConfigOpen(true);
  }

  return (
    <>
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            disabled={atLimit}
            title={
              atLimit
                ? `Maximum ${MAX_CUSTOM_COLUMNS} custom columns`
                : "Add custom column"
            }
          >
            <Plus className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="end">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Choose field type
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FIELD_TYPE_CATALOG.map((field) => (
              <button
                key={field.type}
                type="button"
                className={cn(
                  "flex flex-col items-start rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                )}
                onClick={() => handleTypeSelect(field.type)}
              >
                <span className="font-medium">
                  <span className="mr-1.5 text-muted-foreground">
                    {field.icon}
                  </span>
                  {field.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {field.description}
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {selectedType ? (
        <ColumnConfigDialog
          open={configOpen}
          onOpenChange={(open) => {
            setConfigOpen(open);
            if (!open) setSelectedType(null);
          }}
          mode="create"
          fieldType={selectedType}
          onSubmit={async (data) => {
            await onCreateColumn({
              name: data.name,
              field_type: selectedType,
              options: data.options,
              config: data.config,
            });
            setConfigOpen(false);
            setSelectedType(null);
          }}
          isSubmitting={isCreating}
        />
      ) : null}
    </>
  );
}
