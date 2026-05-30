import { differenceInMinutes } from "date-fns";

import { NextResponse } from "next/server";

import {
  jsonError,
  parseJsonBody,
  withApiContext,
} from "@/lib/api/http";
import { getTaskForOrg } from "@/lib/tasks/access";
import { createTimeLogSchema } from "@/lib/tasks/validators";

function resolveDurationMins(input: {
  duration_mins?: number;
  started_at?: string | null;
  ended_at?: string | null;
}): number {
  if (input.duration_mins !== undefined) {
    return input.duration_mins;
  }

  if (input.started_at && input.ended_at) {
    return Math.max(
      0,
      differenceInMinutes(new Date(input.ended_at), new Date(input.started_at)),
    );
  }

  if (input.started_at && !input.ended_at) {
    return 0;
  }

  return 0;
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

    const { data: timeLogs, error } = await supabase
      .from("time_logs")
      .select("*")
      .eq("task_id", taskId)
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false });

    if (error) {
      return jsonError(error.message, 500);
    }

    const totalMins = (timeLogs ?? []).reduce(
      (sum, log) => sum + log.duration_mins,
      0,
    );

    const { data: runningTimer } = await supabase
      .from("time_logs")
      .select("*")
      .eq("task_id", taskId)
      .eq("org_id", profile.org_id)
      .is("ended_at", null)
      .not("started_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      time_logs: timeLogs ?? [],
      total_mins: totalMins,
      running_timer: runningTimer ?? null,
    });
  });
}

export async function POST(request: Request) {
  return withApiContext(async ({ user, profile, supabase }) => {
    const parsed = await parseJsonBody(request, createTimeLogSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const input = parsed.data;
    const task = await getTaskForOrg(supabase, input.task_id, profile.org_id);

    if (!task) {
      return jsonError("Task not found", 404);
    }

    if (input.stop_timer) {
      const { data: runningTimer } = await supabase
        .from("time_logs")
        .select("*")
        .eq("task_id", input.task_id)
        .eq("logged_by", user.id)
        .eq("org_id", profile.org_id)
        .is("ended_at", null)
        .not("started_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!runningTimer || !runningTimer.started_at) {
        return jsonError("No running timer found for this task", 404);
      }

      const endedAt = new Date().toISOString();
      const durationMins = Math.max(
        0,
        differenceInMinutes(new Date(endedAt), new Date(runningTimer.started_at)),
      );

      const { data: timeLog, error } = await supabase
        .from("time_logs")
        .update({
          ended_at: endedAt,
          duration_mins: durationMins,
          description: input.description ?? runningTimer.description,
        })
        .eq("id", runningTimer.id)
        .select("*")
        .single();

      if (error) {
        return jsonError(error.message, 500);
      }

      return NextResponse.json({ time_log: timeLog });
    }

    const isTimerStart =
      input.started_at && !input.ended_at && input.duration_mins === undefined;

    if (isTimerStart) {
      const { data: existingTimer } = await supabase
        .from("time_logs")
        .select("id")
        .eq("task_id", input.task_id)
        .eq("logged_by", user.id)
        .is("ended_at", null)
        .not("started_at", "is", null)
        .maybeSingle();

      if (existingTimer) {
        return jsonError("You already have a running timer for this task", 400);
      }
    }

    const durationMins = resolveDurationMins(input);

    const { data: timeLog, error } = await supabase
      .from("time_logs")
      .insert({
        task_id: input.task_id,
        org_id: profile.org_id,
        duration_mins: durationMins,
        description: input.description ?? null,
        logged_by: user.id,
        started_at: input.started_at ?? null,
        ended_at: input.ended_at ?? null,
      })
      .select("*")
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ time_log: timeLog }, { status: 201 });
  });
}
