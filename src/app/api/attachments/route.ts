import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  jsonError,
  withApiContext,
} from "@/lib/api/http";
import { createServiceClient } from "@/lib/supabase/server";
import { MAX_ATTACHMENT_BYTES } from "@/lib/tasks/constants";
import { getTaskForOrg } from "@/lib/tasks/access";

function parseUploadFile(value: FormDataEntryValue | null): {
  blob: Blob;
  name: string;
  type: string;
  size: number;
} | null {
  if (value === null || typeof value === "string") {
    return null;
  }

  const blob = value as Blob;

  if (typeof blob.arrayBuffer !== "function" || typeof blob.size !== "number") {
    return null;
  }

  return {
    blob,
    name: value instanceof File ? value.name : "upload",
    type: blob.type || "application/octet-stream",
    size: blob.size,
  };
}

export async function GET(request: Request) {
  return withApiContext(async ({ profile, supabase }) => {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task_id");

    if (!taskId) {
      return jsonError("task_id query parameter is required", 400);
    }

    const task = await getTaskForOrg(supabase, taskId, profile.org_id);

    if (!task) {
      return jsonError("Task not found", 404);
    }

    const { data: attachments, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("task_id", taskId)
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false });

    if (error) {
      return jsonError(error.message, 500);
    }

    const serviceSupabase = await createServiceClient();

    const attachmentsWithUrls = await Promise.all(
      (attachments ?? []).map(async (attachment) => {
        const { data: signedUrl } = await serviceSupabase.storage
          .from("task-attachments")
          .createSignedUrl(attachment.storage_path, 3600);

        return {
          ...attachment,
          url: signedUrl?.signedUrl ?? null,
        };
      }),
    );

    return NextResponse.json({ attachments: attachmentsWithUrls });
  });
}

export async function POST(request: Request) {
  return withApiContext(async ({ user, profile, supabase }) => {
    const formData = await request.formData();
    const taskId = formData.get("task_id");
    const upload = parseUploadFile(formData.get("file"));

    if (typeof taskId !== "string" || !taskId) {
      return jsonError("task_id is required", 400);
    }

    if (!upload) {
      return jsonError("file is required", 400);
    }

    if (upload.size > MAX_ATTACHMENT_BYTES) {
      return jsonError("File exceeds 25MB limit", 400);
    }

    const task = await getTaskForOrg(supabase, taskId, profile.org_id);

    if (!task) {
      return jsonError("Task not found", 404);
    }

    const safeName = upload.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${profile.org_id}/${taskId}/${randomUUID()}-${safeName}`;

    let fileBuffer: Buffer;

    try {
      fileBuffer = Buffer.from(await upload.blob.arrayBuffer());
    } catch {
      return jsonError("Failed to read uploaded file", 400);
    }

    const serviceSupabase = await createServiceClient();

    const { error: uploadError } = await serviceSupabase.storage
      .from("task-attachments")
      .upload(storagePath, fileBuffer, {
        contentType: upload.type,
        upsert: false,
      });

    if (uploadError) {
      return jsonError(uploadError.message, 500);
    }

    const { data: attachment, error } = await supabase
      .from("attachments")
      .insert({
        task_id: taskId,
        org_id: profile.org_id,
        storage_path: storagePath,
        filename: upload.name,
        mime_type: upload.type || null,
        size_bytes: upload.size,
        uploaded_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      await serviceSupabase.storage.from("task-attachments").remove([storagePath]);
      return jsonError(error.message, 500);
    }

    const { data: signedUrl } = await serviceSupabase.storage
      .from("task-attachments")
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json(
      {
        attachment: {
          ...attachment,
          url: signedUrl?.signedUrl ?? null,
        },
      },
      { status: 201 },
    );
  });
}
