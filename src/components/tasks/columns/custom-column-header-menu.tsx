"use client";

import { useState } from "react";
import { EyeOff, MoreHorizontal, Pencil, Settings, Trash2 } from "lucide-react";

import { ColumnConfigDialog } from "@/components/tasks/columns/column-config-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  parseColumnConfig,
  parseColumnOptions,
  type ColumnConfig,
} from "@/lib/custom-columns/types";
import type { CustomColumnRow } from "@/lib/custom-columns/types";

interface CustomColumnHeaderMenuProps {
  column: CustomColumnRow;
  onUpdate: (
    id: string,
    patch: {
      name?: string;
      options?: { label: string; color: string }[];
      config?: ColumnConfig;
      is_visible?: boolean;
    },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isUpdating?: boolean;
}

export function CustomColumnHeaderMenu({
  column,
  onUpdate,
  onDelete,
  isUpdating,
}: CustomColumnHeaderMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 opacity-0 group-hover/header:opacity-100"
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <Pencil className="mr-2 size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Settings className="mr-2 size-4" />
            Edit options
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdate(column.id, { is_visible: false })}
          >
            <EyeOff className="mr-2 size-4" />
            Hide
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ColumnConfigDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        mode="edit"
        fieldType={column.field_type}
        initialName={column.name}
        initialOptions={parseColumnOptions(column.options)}
        initialConfig={parseColumnConfig(column.config)}
        onSubmit={async (data) => {
          await onUpdate(column.id, { name: data.name });
          setRenameOpen(false);
        }}
        isSubmitting={isUpdating}
      />

      <ColumnConfigDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        fieldType={column.field_type}
        initialName={column.name}
        initialOptions={parseColumnOptions(column.options)}
        initialConfig={parseColumnConfig(column.config)}
        onSubmit={async (data) => {
          await onUpdate(column.id, {
            name: data.name,
            options: data.options,
            config: data.config,
          });
          setEditOpen(false);
        }}
        isSubmitting={isUpdating}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete column?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes &quot;{column.name}&quot; from the view. Task values
              in custom_data are kept until you clear them manually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await onDelete(column.id);
                setDeleteOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
