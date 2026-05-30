"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  onImageUpload?: (file: File) => Promise<string | null>;
}

function handleSlashCommand(editor: Editor, lineText: string): boolean {
  if (lineText.startsWith("/bullet")) {
    editor.chain().focus().clearNodes().toggleBulletList().run();
    return true;
  }
  if (lineText.startsWith("/heading")) {
    editor.chain().focus().clearNodes().toggleHeading({ level: 2 }).run();
    return true;
  }
  if (lineText.startsWith("/code")) {
    editor.chain().focus().clearNodes().toggleCodeBlock().run();
    return true;
  }
  return false;
}

export function TiptapEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Write something...",
  className,
  minHeight = "120px",
  onImageUpload,
}: TiptapEditorProps) {
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const onImageUploadRef = useRef(onImageUpload);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
    onImageUploadRef.current = onImageUpload;
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: true, allowBase64: false }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none px-3 py-2 min-h-[inherit]",
      },
      handleKeyDown: (view, event) => {
        if (event.key !== "Enter" || event.shiftKey) return false;

        const { $from } = view.state.selection;
        const lineText = $from.parent.textContent;

        if (
          editorRef.current &&
          (lineText.startsWith("/bullet") ||
            lineText.startsWith("/heading") ||
            lineText.startsWith("/code"))
        ) {
          event.preventDefault();
          const from = $from.start();
          const to = $from.pos;
          view.dispatch(view.state.tr.delete(from, to));
          handleSlashCommand(editorRef.current, lineText);
          return true;
        }

        return false;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items || !onImageUploadRef.current) return false;

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (!file) continue;

            event.preventDefault();
            void onImageUploadRef.current(file).then((url) => {
              if (url && editorRef.current) {
                editorRef.current.chain().focus().setImage({ src: url }).run();
              }
            });
            return true;
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChangeRef.current(ed.getHTML());
    },
    onBlur: () => {
      onBlurRef.current?.();
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (current !== next && !(next === "" && current === "<p></p>")) {
      editor.commands.setContent(next || "", { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div
      data-editor
      className={cn("rounded-md border bg-background", className)}
      style={{ minHeight }}
    >
      <EditorContent editor={editor} />
      <p className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
        Slash: /bullet · /heading · /code · Paste images to upload
      </p>
    </div>
  );
}
