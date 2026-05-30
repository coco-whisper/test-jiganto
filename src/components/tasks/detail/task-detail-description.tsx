"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { Label } from "@/components/ui/label";
import { useTaskAttachments } from "@/hooks/use-task-detail-data";

interface TaskDetailDescriptionProps {
  taskId: string;
  description: string | null;
  onSave: (description: string | null) => void;
}

export function TaskDetailDescription({
  taskId,
  description,
  onSave,
}: TaskDetailDescriptionProps) {
  const [html, setHtml] = useState(description ?? "");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { uploadAttachment } = useTaskAttachments(taskId);

  useEffect(() => {
    setHtml(description ?? "");
  }, [description, taskId]);

  const persist = useCallback(
    (value: string) => {
      const normalized = value.replace(/<p><\/p>/g, "").trim();
      const next =
        normalized === "" || normalized === "<p></p>" ? null : value;
      const current =
        !description || description === "<p></p>" ? null : description;
      if (next !== current) onSave(next);
    },
    [description, onSave],
  );

  function scheduleSave(value: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persist(value), 800);
  }

  async function handleImageUpload(file: File): Promise<string | null> {
    try {
      const attachment = await uploadAttachment.mutateAsync(file);
      return attachment.url ?? null;
    } catch {
      return null;
    }
  }

  return (
    <div className="space-y-2">
      <Label>Description</Label>
      <TiptapEditor
        value={html}
        onChange={(value) => {
          setHtml(value);
          scheduleSave(value);
        }}
        onBlur={() => {
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
          }
          persist(html);
        }}
        placeholder="Add a description..."
        minHeight="200px"
        onImageUpload={handleImageUpload}
      />
    </div>
  );
}
