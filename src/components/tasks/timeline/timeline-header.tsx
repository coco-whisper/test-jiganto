"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TimelineConfig, TimelineZoom } from "@/lib/tasks/timeline-config";

interface TimelineHeaderProps {
  config: TimelineConfig;
  onConfigChange: (config: TimelineConfig) => void;
  scheduledCount: number;
  unscheduledCount: number;
}

export function TimelineHeader({
  config,
  onConfigChange,
  scheduledCount,
  unscheduledCount,
}: TimelineHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold">Timeline</h2>
        <p className="text-xs text-muted-foreground">
          {scheduledCount} scheduled
          {unscheduledCount > 0
            ? ` · ${unscheduledCount} unscheduled`
            : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <ToggleGroup
          type="single"
          value={config.zoom}
          onValueChange={(value) => {
            if (value === "week" || value === "month" || value === "quarter") {
              onConfigChange({
                ...config,
                zoom: value as TimelineZoom,
              });
            }
          }}
          className="rounded-md border p-0.5"
        >
          <ToggleGroupItem value="week" className="h-8 px-3 text-xs">
            Week
          </ToggleGroupItem>
          <ToggleGroupItem value="month" className="h-8 px-3 text-xs">
            Month
          </ToggleGroupItem>
          <ToggleGroupItem value="quarter" className="h-8 px-3 text-xs">
            Quarter
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="flex items-center gap-2">
          <Switch
            id="show-unscheduled"
            checked={config.show_unscheduled}
            onCheckedChange={(checked) =>
              onConfigChange({ ...config, show_unscheduled: checked })
            }
          />
          <Label htmlFor="show-unscheduled" className="text-xs">
            Show unscheduled
          </Label>
        </div>
      </div>
    </div>
  );
}
