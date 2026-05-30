"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColumnDefinition } from "@/lib/tasks/client-filter";
import {
  getImportFieldOptions,
  guessFieldMapping,
  parseCsv,
  rowsToImportPayload,
  type ImportFieldKey,
} from "@/lib/tasks/csv";
import { useToast } from "@/hooks/use-toast";

interface ImportCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string | null;
  visibleColumns: ColumnDefinition[];
  onSuccess: () => void;
}

export function ImportCsvDialog({
  open,
  onOpenChange,
  projectId,
  visibleColumns,
  onSuccess,
}: ImportCsvDialogProps) {
  const { toast } = useToast();
  const [csvRows, setCsvRows] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<Record<number, ImportFieldKey>>({});
  const [mode, setMode] = useState<"append" | "overwrite">("append");
  const [isImporting, setIsImporting] = useState(false);

  const headers = csvRows?.[0] ?? [];
  const previewRows = csvRows?.slice(1, 4) ?? [];
  const fieldOptions = useMemo(
    () => getImportFieldOptions(visibleColumns),
    [visibleColumns],
  );

  function reset() {
    setCsvRows(null);
    setMapping({});
    setMode("append");
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = parseCsv(text.replace(/^\uFEFF/, ""));

    if (parsed.length < 2) {
      toast({
        title: "Invalid CSV",
        description: "The file needs a header row and at least one data row.",
        variant: "destructive",
      });
      return;
    }

    setCsvRows(parsed);
    setMapping(guessFieldMapping(parsed[0], visibleColumns));
    event.target.value = "";
  }

  async function handleImport() {
    if (!csvRows) return;

    const hasName = Object.values(mapping).includes("name");
    if (!hasName) {
      toast({
        title: "Map Task Name",
        description: "Select which CSV column contains task names.",
        variant: "destructive",
      });
      return;
    }

    const rows = rowsToImportPayload(csvRows, mapping);
    if (rows.length === 0) {
      toast({
        title: "No rows to import",
        description: "Check your column mapping and data rows.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch("/api/tasks/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId ?? null,
          standalone: !projectId,
          mode,
          rows,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Import failed");
      }

      const summary = [
        payload.created > 0 ? `${payload.created} created` : null,
        payload.updated > 0 ? `${payload.updated} updated` : null,
        payload.deleted > 0 ? `${payload.deleted} removed` : null,
      ]
        .filter(Boolean)
        .join(", ");

      toast({
        title: "Import complete",
        description:
          summary ||
          (payload.errors?.length
            ? "Completed with warnings"
            : "No changes made"),
      });

      if (payload.errors?.length) {
        toast({
          title: "Import warnings",
          description: payload.errors.slice(0, 3).join(" · "),
          variant: "destructive",
        });
      }

      onSuccess();
      handleOpenChange(false);
    } catch (error) {
      toast({
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "Could not import tasks",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file (same format as export). Map columns, then choose
            append or overwrite.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV file</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <label htmlFor="csv-file" className="cursor-pointer gap-2">
                  <Upload className="size-4" />
                  Choose file
                </label>
              </Button>
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={handleFileChange}
              />
              {csvRows ? (
                <span className="text-sm text-muted-foreground">
                  {csvRows.length - 1} row(s)
                </span>
              ) : null}
            </div>
          </div>

          {headers.length > 0 ? (
            <>
              <div className="space-y-2">
                <Label>Column mapping</Label>
                <div className="space-y-2 rounded-md border p-3">
                  {headers.map((header, index) => (
                    <div
                      key={`${header}-${index}`}
                      className="grid grid-cols-2 items-center gap-2"
                    >
                      <span className="truncate text-sm font-medium">
                        {header || `Column ${index + 1}`}
                      </span>
                      <Select
                        value={mapping[index] ? mapping[index] : "__skip__"}
                        onValueChange={(value) =>
                          setMapping((current) => ({
                            ...current,
                            [index]:
                              value === "__skip__"
                                ? ""
                                : (value as ImportFieldKey),
                          }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Skip" />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldOptions.map((option) => (
                            <SelectItem
                              key={option.value || "__skip__"}
                              value={option.value || "__skip__"}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {previewRows.length > 0 ? (
                <div className="overflow-x-auto rounded-md border text-xs">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        {headers.map((header, index) => (
                          <th key={index} className="px-2 py-1 text-left">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t">
                          {headers.map((_, colIndex) => (
                            <td key={colIndex} className="px-2 py-1">
                              {row[colIndex] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Import mode</Label>
                <RadioGroup
                  value={mode}
                  onValueChange={(value) =>
                    setMode(value as "append" | "overwrite")
                  }
                  className="space-y-2"
                >
                  <div className="flex items-start gap-2 rounded-md border p-3">
                    <RadioGroupItem value="append" id="import-append" />
                    <div>
                      <Label htmlFor="import-append" className="font-medium">
                        Append
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Add new tasks. Rows with an ID update existing tasks in
                        this list.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-md border border-destructive/30 p-3">
                    <RadioGroupItem value="overwrite" id="import-overwrite" />
                    <div>
                      <Label htmlFor="import-overwrite" className="font-medium">
                        Overwrite
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Delete all tasks in this list, then import the CSV
                        rows as new tasks.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!csvRows || isImporting}
          >
            {isImporting ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
