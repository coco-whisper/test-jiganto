import { NextResponse } from "next/server";

import {
  jsonError,
  parseJsonBody,
  withApiContext,
} from "@/lib/api/http";
import { getTaskForOrg } from "@/lib/tasks/access";
import { createCommentSchema } from "@/lib/tasks/validators";

interface CommentNode {
  id: string;
  task_id: string;
  org_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  replies: CommentNode[];
}

function buildCommentTree(comments: CommentNode[]): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    byId.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of byId.values()) {
    if (comment.parent_id && byId.has(comment.parent_id)) {
      byId.get(comment.parent_id)!.replies.push(comment);
    } else {
      roots.push(comment);
    }
  }

  return roots;
}

export async function GET(request: Request) {
  return withApiContext(async ({ profile, supabase }) => {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task_id");
    const threaded = searchParams.get("threaded") !== "false";

    if (!taskId) {
      return jsonError("task_id query parameter is required", 400);
    }

    const task = await getTaskForOrg(supabase, taskId, profile.org_id);

    if (!task) {
      return jsonError("Task not found", 404);
    }

    const { data: comments, error } = await supabase
      .from("comments")
      .select("*")
      .eq("task_id", taskId)
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: true });

    if (error) {
      return jsonError(error.message, 500);
    }

    const flatComments = comments ?? [];

    if (threaded) {
      return NextResponse.json({
        comments: buildCommentTree(flatComments as CommentNode[]),
      });
    }

    return NextResponse.json({ comments: flatComments });
  });
}

export async function POST(request: Request) {
  return withApiContext(async ({ user, profile, supabase }) => {
    const parsed = await parseJsonBody(request, createCommentSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const input = parsed.data;
    const task = await getTaskForOrg(supabase, input.task_id, profile.org_id);

    if (!task) {
      return jsonError("Task not found", 404);
    }

    if (input.parent_id) {
      const { data: parentComment } = await supabase
        .from("comments")
        .select("id, task_id")
        .eq("id", input.parent_id)
        .eq("org_id", profile.org_id)
        .maybeSingle();

      if (!parentComment || parentComment.task_id !== input.task_id) {
        return jsonError("Parent comment not found for this task", 404);
      }
    }

    const { data: comment, error } = await supabase
      .from("comments")
      .insert({
        task_id: input.task_id,
        org_id: profile.org_id,
        user_id: user.id,
        parent_id: input.parent_id ?? null,
        body: input.body,
      })
      .select("*")
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ comment }, { status: 201 });
  });
}
