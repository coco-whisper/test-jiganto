"use client";

import { useCallback, useState } from "react";
import { FileIcon, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MAX_ATTACHMENT_BYTES } from "@/lib/tasks/constants";
import { useTaskAttachments } from "@/hooks/use-task-detail-data";
import { cn } from "@/lib/utils";

interface TaskDetailAttachmentsProps {
  taskId: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskDetailAttachments({ taskId }: TaskDetailAttachmentsProps) {
  const { data: attachments = [], isLoading, uploadAttachment } =
    useTaskAttachments(taskId);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of files) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          alert(`${file.name} exceeds 25MB limit`);
          continue;
        }
        await uploadAttachment.mutateAsync(file);
      }
    },
    [uploadAttachment],
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void uploadFiles(event.dataTransfer.files);
        }}
      >
        <Upload className="mb-2 size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Drag files here</p>
        <p className="text-xs text-muted-foreground">Max 25MB per file</p>
        <label className="mt-3">
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) void uploadFiles(event.target.files);
            }}
          />
          <Button variant="outline" size="sm" asChild>
            <span>Browse files</span>
          </Button>
        </label>
      </div>

      {uploadAttachment.isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Uploading...
        </div>
      ) : null}

      <div className="grid gap-2">
        {attachments.map((attachment) => {
          const isImage = attachment.mime_type?.startsWith("image/");

          return (
            <div
              key={attachment.id}
              className="flex items-center gap-3 rounded-md border p-2"
            >
              {isImage && attachment.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URLs
                <img
                  src={attachment.url}
                  alt={attachment.filename}
                  className="size-12 rounded object-cover"
                />
              ) : (
                <div className="flex size-12 items-center justify-center rounded bg-muted">
                  <FileIcon className="size-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {attachment.url ? (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-medium text-primary hover:underline"
                  >
                    {attachment.filename}
                  </a>
                ) : (
                  <p className="truncate text-sm font-medium">
                    {attachment.filename}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatBytes(attachment.size_bytes)}
                </p>
              </div>
            </div>
          );
        })}
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachments yet.</p>
        ) : null}
      </div>
    </div>
  );
}
