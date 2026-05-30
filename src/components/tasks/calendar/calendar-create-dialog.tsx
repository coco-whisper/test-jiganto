"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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
import { formatDropDateLabel } from "@/lib/tasks/calendar";

interface CalendarCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dueDate: string | null;
  dueTime?: string | null;
  onSubmit: (name: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function CalendarCreateDialog({
  open,
  onOpenChange,
  dueDate,
  dueTime,
  onSubmit,
  isSubmitting,
}: CalendarCreateDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName("");
  }, [open, dueDate]);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        {dueDate ? (
          <p className="text-sm text-muted-foreground">
            Due {formatDropDateLabel(dueDate)}
            {dueTime ? ` at ${dueTime}` : ""}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label>Task name</Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="What needs to be done?"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSubmit();
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
