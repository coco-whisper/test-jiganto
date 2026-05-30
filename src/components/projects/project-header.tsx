"use client";

import { useRef } from "react";
import { format, parseISO } from "date-fns";
import { Building2, CalendarRange, GanttChart } from "lucide-react";

import { FloatingParticles } from "@/components/layout/floating-particles";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProjectMemberProfile } from "@/lib/projects/members";
import {
  memberDisplayName,
  memberInitials,
} from "@/lib/projects/members";
import { formatStatusLabel } from "@/lib/tasks/client-filter";
import type { TaskStatus } from "@/lib/database.types";
import { cn } from "@/lib/utils";

function formatProjectDate(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export interface ProjectHeaderProps {
  name: string;
  status: TaskStatus;
  clientName?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  members?: ProjectMemberProfile[];
}

export function ProjectHeader({
  name,
  status,
  clientName,
  startDate,
  dueDate,
  members = [],
}: ProjectHeaderProps) {
  const startLabel = formatProjectDate(startDate);
  const dueLabel = formatProjectDate(dueDate);
  const dateRange =
    startLabel && dueLabel
      ? `${startLabel} – ${dueLabel}`
      : startLabel
        ? `Started ${startLabel}`
        : dueLabel
          ? `Due ${dueLabel}`
          : null;

  const headerRef = useRef<HTMLDivElement>(null);

  return (
    <TooltipProvider delayDuration={200}>
    <div
      ref={headerRef}
      className="relative w-full min-w-0 shrink-0 overflow-hidden border-b bg-primary/5 px-6 py-5"
    >
      <FloatingParticles containerRef={headerRef} />
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-primary">{name}</h1>
            <Badge
              variant="outline"
              className="capitalize border-primary/20 bg-primary/10 text-primary"
            >
              {formatStatusLabel(status)}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {clientName ? (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="size-3.5 shrink-0" />
                <span>
                  Client:{" "}
                  <span className="font-medium text-foreground">
                    {clientName}
                  </span>
                </span>
              </span>
            ) : null}

            {members.length > 0 ? (
              <span className="inline-flex items-center gap-2">
                <span>Members</span>
                <div className="flex -space-x-2">
                  {members.slice(0, 6).map((member) => (
                    <Tooltip key={member.id}>
                      <TooltipTrigger asChild>
                        <Avatar
                          className={cn(
                            "size-7 border-2 border-primary/10",
                          )}
                        >
                          {member.avatar_url ? (
                            <AvatarImage
                              src={member.avatar_url}
                              alt={memberDisplayName(member)}
                            />
                          ) : null}
                          <AvatarFallback className="text-[10px]">
                            {memberInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {memberDisplayName(member)}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {members.length > 6 ? (
                    <span className="flex size-7 items-center justify-center rounded-full border-2 border-primary/10 bg-primary/10 text-[10px] font-medium text-primary">
                      +{members.length - 6}
                    </span>
                  ) : null}
                </div>
              </span>
            ) : (
              <span className="text-muted-foreground/80">
                No members on project tasks yet
              </span>
            )}

            {dateRange ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarRange className="size-3.5 shrink-0" />
                {dateRange}
              </span>
            ) : null}
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button variant="outline" size="sm" disabled className="gap-2">
                <GanttChart className="size-4" />
                Promote to Gantt
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            Full Gantt projects are not available in this demo. Timeline view
            covers scheduling for now.
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
    </TooltipProvider>
  );
}
