"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Download, Upload } from "lucide-react";

import { ImportCsvDialog } from "@/components/tasks/toolbar/import-csv-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrgClient, OrgMember } from "@/hooks/use-org-data";
import { useToast } from "@/hooks/use-toast";
import type { ColumnDefinition, TaskWithMeta } from "@/lib/tasks/client-filter";
import {
  buildCsvContent,
  buildExportColumns,
  downloadCsvFile,
} from "@/lib/tasks/csv";

interface ImportExportMenuProps {
  tasks: TaskWithMeta[];
  visibleColumns: ColumnDefinition[];
  members: OrgMember[];
  clients: OrgClient[];
  projectId?: string | null;
  onImportSuccess: () => void;
}

export function ImportExportMenu({
  tasks,
  visibleColumns,
  members,
  clients,
  projectId,
  onImportSuccess,
}: ImportExportMenuProps) {
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);

  const columnsById = useMemo(
    () => new Map(visibleColumns.map((column) => [column.id, column])),
    [visibleColumns],
  );

  const exportColumns = useMemo(
    () => buildExportColumns(visibleColumns),
    [visibleColumns],
  );

  function handleExport() {
    if (tasks.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Add tasks or clear filters to export data.",
      });
      return;
    }

    const content = buildCsvContent(tasks, exportColumns, {
      members,
      clients,
      columnsById,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    const scope = projectId ? `project-${projectId.slice(0, 8)}` : "standalone";
    downloadCsvFile(`jiganto-tasks-${scope}-${stamp}.csv`, content);

    toast({
      title: "Export started",
      description: `${tasks.length} task(s) exported with ${exportColumns.length} columns.`,
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowDownUp className="size-4" />
            Import / Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="gap-2"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="size-4" />
            Import CSV
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onClick={handleExport}>
            <Download className="size-4" />
            Export CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        projectId={projectId}
        visibleColumns={visibleColumns}
        onSuccess={onImportSuccess}
      />
    </>
  );
}
