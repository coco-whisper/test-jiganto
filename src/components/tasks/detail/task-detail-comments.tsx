"use client";

import { useState } from "react";
import { Loader2, Reply } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { OrgMember } from "@/hooks/use-org-data";
import { useTaskComments, type Comment } from "@/hooks/use-task-detail-data";

interface TaskDetailCommentsProps {
  taskId: string;
  members: OrgMember[];
  currentUserId?: string;
}

function extractMentions(html: string): string[] {
  const matches = html.match(/data-mention-id="([^"]+)"/g) ?? [];
  return matches
    .map((match) => match.match(/data-mention-id="([^"]+)"/)?.[1])
    .filter((id): id is string => Boolean(id));
}

export function TaskDetailComments({
  taskId,
  members,
  currentUserId,
}: TaskDetailCommentsProps) {
  const { data: comments = [], isLoading, createComment } =
    useTaskComments(taskId);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  async function handlePost() {
    const trimmed = body.replace(/<p><\/p>/g, "").trim();
    if (!trimmed || trimmed === "<p></p>") return;

    setIsPosting(true);
    try {
      const result = await createComment.mutateAsync({
        body: trimmed,
        parent_id: replyTo,
      });

      const mentionIds = extractMentions(trimmed);
      for (const userId of mentionIds) {
        if (userId === currentUserId) continue;
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            task_id: taskId,
            comment_id: result.comment.id,
            type: "mention",
            message: "You were mentioned in a task comment",
          }),
        });
      }

      setBody("");
      setReplyTo(null);
    } finally {
      setIsPosting(false);
    }
  }

  function insertMention(member: OrgMember) {
    const label = member.display_name ?? member.email.split("@")[0];
    setBody(
      (current) =>
        `${current}<span data-mention-id="${member.id}">@${label}</span> `,
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {members.map((member) => (
          <Button
            key={member.id}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => insertMention(member)}
          >
            @{member.display_name ?? member.email.split("@")[0]}
          </Button>
        ))}
      </div>

      {replyTo ? (
        <p className="text-xs text-muted-foreground">
          Replying to comment ·{" "}
          <button
            type="button"
            className="text-primary underline"
            onClick={() => setReplyTo(null)}
          >
            Cancel
          </button>
        </p>
      ) : null}

      <TiptapEditor
        value={body}
        onChange={setBody}
        placeholder="Add a comment... Use @buttons above to mention"
        minHeight="100px"
      />

      <Button size="sm" onClick={handlePost} disabled={isPosting}>
        {isPosting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Post comment
      </Button>

      <div className="space-y-4 pt-2">
        {comments.map((comment) => (
          <CommentThread
            key={comment.id}
            comment={comment}
            members={members}
            onReply={() => setReplyTo(comment.id)}
          />
        ))}
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : null}
      </div>
    </div>
  );
}

function CommentThread({
  comment,
  members,
  onReply,
  depth = 0,
}: {
  comment: Comment;
  members: OrgMember[];
  onReply: () => void;
  depth?: number;
}) {
  const author = members.find((member) => member.id === comment.user_id);

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="flex gap-2">
        <Avatar className="size-7">
          <AvatarFallback className="text-[10px]">
            {(author?.display_name ?? author?.email ?? "?")
              .slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {author?.display_name ?? author?.email ?? "User"}
            </span>
            <span>
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
          <div
            className="prose prose-sm mt-1 max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: comment.body }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-7 gap-1 px-2 text-xs"
            onClick={onReply}
          >
            <Reply className="size-3" />
            Reply
          </Button>
        </div>
      </div>
      {comment.replies?.map((reply) => (
        <div key={reply.id} className="mt-3">
          <CommentThread
            comment={reply}
            members={members}
            onReply={onReply}
            depth={depth + 1}
          />
        </div>
      ))}
    </div>
  );
}
