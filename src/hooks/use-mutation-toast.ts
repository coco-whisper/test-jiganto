"use client";

import { useMemo } from "react";

import { useToast } from "@/hooks/use-toast";

export function useMutationToast() {
  const { toast } = useToast();

  return useMemo(
    () => ({
      saved: (description?: string) =>
        toast({
          title: "Saved",
          description,
        }),
      created: (description?: string) =>
        toast({
          title: "Created",
          description,
        }),
      error: (error: unknown, fallback = "Something went wrong") =>
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : fallback,
          variant: "destructive",
        }),
    }),
    [toast],
  );
}
