import type { ApiSupabase } from "@/lib/api/http";
import type { Profile } from "@/lib/database.types";
import type { Json } from "@/lib/database.types";
import { syncTaskMembers } from "@/lib/tasks/access";
import type { ParsedImportRow } from "@/lib/tasks/csv";
import { getNextTaskPosition } from "@/lib/tasks/position";

export type ImportMode = "append" | "overwrite";

export interface ImportTasksInput {
  rows: ParsedImportRow[];
  mode: ImportMode;
  projectId: string | null;
  orgId: string;
  userId: string;
}

export interface ImportTasksResult {
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}

async function resolveClientId(
  supabase: ApiSupabase,
  orgId: string,
  clientName: string | null | undefined,
): Promise<string | null> {
  if (!clientName?.trim()) return null;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("org_id", orgId);

  const normalized = clientName.trim().toLowerCase();
  const client = (clients ?? []).find(
    (item) => item.name.toLowerCase() === normalized,
  );

  return client?.id ?? null;
}


async function resolveMemberIds(
  supabase: ApiSupabase,
  orgId: string,
  emails: string[] | undefined,
): Promise<string[]> {
  if (!emails?.length) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("org_id", orgId);

  const byEmail = new Map(
    (profiles ?? []).map((profile) => [
      profile.email.toLowerCase(),
      profile.id,
    ]),
  );

  return emails
    .map((email) => byEmail.get(email.toLowerCase()))
    .filter((id): id is string => Boolean(id));
}

function scopeQuery(
  supabase: ApiSupabase,
  orgId: string,
  projectId: string | null,
) {
  let query = supabase.from("tasks").select("id").eq("org_id", orgId);

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  return query;
}

export async function importTasks(
  supabase: ApiSupabase,
  profile: Profile,
  input: ImportTasksInput,
): Promise<ImportTasksResult> {
  const result: ImportTasksResult = {
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [],
  };

  if (input.mode === "overwrite") {
    const { data: existing, error: listError } = await scopeQuery(
      supabase,
      input.orgId,
      input.projectId,
    );

    if (listError) {
      throw new Error(listError.message);
    }

    const ids = existing?.map((task) => task.id) ?? [];
    if (ids.length > 0) {
      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .in("id", ids);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      result.deleted = ids.length;
    }
  }

  let position = await getNextTaskPosition(
    supabase,
    input.orgId,
    input.projectId,
  );

  for (const [index, row] of input.rows.entries()) {
    try {
      const clientId = await resolveClientId(
        supabase,
        input.orgId,
        row.client_name,
      );
      const memberIds = await resolveMemberIds(
        supabase,
        input.orgId,
        row.member_emails,
      );

      const taskPayload = {
        name: row.name.trim(),
        status: row.status ?? "new",
        priority: row.priority ?? null,
        due_date: row.due_date ?? null,
        start_date: row.start_date ?? null,
        client_id: clientId,
        description: row.description ?? null,
        progress: row.progress ?? 0,
        is_archived: row.is_archived ?? false,
        custom_data: (row.custom_data ?? {}) as Json,
      };

      if (input.mode === "append" && row.id) {
        const { data: existing } = await supabase
          .from("tasks")
          .select("id")
          .eq("id", row.id)
          .eq("org_id", input.orgId)
          .maybeSingle();

        if (existing) {
          const { error: updateError } = await supabase
            .from("tasks")
            .update(taskPayload)
            .eq("id", row.id);

          if (updateError) {
            result.errors.push(`Row ${index + 2}: ${updateError.message}`);
            continue;
          }

          if (row.member_emails) {
            await syncTaskMembers(
              supabase,
              row.id,
              memberIds,
              input.orgId,
            );
          }

          result.updated += 1;
          continue;
        }
      }

      const { data: created, error: insertError } = await supabase
        .from("tasks")
        .insert({
          org_id: input.orgId,
          project_id: input.projectId,
          created_by: input.userId,
          position,
          ...taskPayload,
        })
        .select("*")
        .single();

      if (insertError) {
        result.errors.push(`Row ${index + 2}: ${insertError.message}`);
        continue;
      }

      position += 1;

      if (memberIds.length > 0) {
        await syncTaskMembers(
          supabase,
          created.id,
          memberIds,
          input.orgId,
        );
      }

      result.created += 1;
    } catch (error) {
      result.errors.push(
        `Row ${index + 2}: ${
          error instanceof Error ? error.message : "Import failed"
        }`,
      );
    }
  }

  return result;
}
