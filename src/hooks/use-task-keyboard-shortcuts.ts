"use client";

import { useEffect } from "react";

import type { ViewMode } from "@/lib/database.types";
import { isTypingTarget } from "@/lib/tasks/keyboard";

interface UseTaskKeyboardShortcutsOptions {
  viewMode: ViewMode;
  search: string;
  onNewTask: () => void;
  onClearSearch: () => void;
  onCancelDraft?: () => void;
  hasActiveDraft?: boolean;
  enabled?: boolean;
}

export function useTaskKeyboardShortcuts({
  viewMode,
  search,
  onNewTask,
  onClearSearch,
  onCancelDraft,
  hasActiveDraft = false,
  enabled = true,
}: UseTaskKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.key.toLowerCase() === "n" && !event.metaKey && !event.ctrlKey) {
        if (viewMode === "table") {
          event.preventDefault();
          onNewTask();
        }
        return;
      }

      if (event.key === "Escape") {
        if (hasActiveDraft && onCancelDraft) {
          event.preventDefault();
          onCancelDraft();
          return;
        }

        if (search) {
          event.preventDefault();
          onClearSearch();
        }
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    enabled,
    viewMode,
    search,
    onNewTask,
    onClearSearch,
    onCancelDraft,
    hasActiveDraft,
  ]);
}
