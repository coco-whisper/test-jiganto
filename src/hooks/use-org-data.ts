"use client";

import { useQuery } from "@tanstack/react-query";

export interface OrgMember {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface OrgClient {
  id: string;
  name: string;
  logo_url: string | null;
}

export function useOrgMembers() {
  return useQuery({
    queryKey: ["org-members"],
    queryFn: async (): Promise<OrgMember[]> => {
      const response = await fetch("/api/members");
      if (!response.ok) {
        throw new Error("Failed to load members");
      }
      const payload = await response.json();
      return payload.members ?? [];
    },
    staleTime: 60_000,
  });
}

export function useOrgClients() {
  return useQuery({
    queryKey: ["org-clients"],
    queryFn: async (): Promise<OrgClient[]> => {
      const response = await fetch("/api/clients");
      if (!response.ok) {
        throw new Error("Failed to load clients");
      }
      const payload = await response.json();
      return payload.clients ?? [];
    },
    staleTime: 60_000,
  });
}
