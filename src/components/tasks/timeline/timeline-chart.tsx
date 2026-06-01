"use client";

import { format } from "date-fns";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import "@/components/tasks/timeline/timeline-chart.css";
import {
  resolveTaskSpan,
  timelineDatesToPatch,
  toTimelineBars,
  type TimelineBar,
} from "@/lib/tasks/timeline-data";
import type { TimelineZoom } from "@/lib/tasks/timeline-config";
import {
  GRID_LABEL_WIDTH,
  SCALE_ROW_HEIGHT,
  barGeometry,
  computeTimelineViewport,
  dateAtPixel,
  shiftSpanByDays,
  snapBarSpan,
  todayMarkerOffset,
  type TimelineViewport,
} from "@/lib/tasks/timeline-range";
import type { TaskWithMeta } from "@/lib/tasks/client-filter";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 36;
const BAR_HEIGHT = 26;
const HEADER_HEIGHT = SCALE_ROW_HEIGHT * 2;

interface TimelineChartProps {
  scheduledTasks: TaskWithMeta[];
  zoom: TimelineZoom;
  onOpenTask: (task: TaskWithMeta) => void;
  onUpdateDates: (
    taskId: string,
    patch: { start_date: string | null; due_date: string | null },
  ) => void;
}

type DragMode = "move" | "resize-start" | "resize-end";

interface DragState {
  taskId: string;
  mode: DragMode;
  pointerId: number;
  originX: number;
  spanStart: Date;
  spanEnd: Date;
}

function ScaleRow({
  cells,
}: {
  cells: { key: string; label: string; widthPx: number }[];
}) {
  return (
    <div className="flex h-[25px] border-b bg-muted/40">
      {cells.map((cell) => (
        <div
          key={cell.key}
          className="flex shrink-0 items-center justify-center border-r px-1 text-[10px] font-medium text-muted-foreground"
          style={{ width: cell.widthPx }}
        >
          <span className="truncate">{cell.label}</span>
        </div>
      ))}
    </div>
  );
}

function pointerXInChart(
  clientX: number,
  chartArea: HTMLElement,
  scrollLeft: number,
): number {
  const rect = chartArea.getBoundingClientRect();
  return clientX - rect.left + scrollLeft;
}

function TimelineBarRow({
  bar,
  task,
  viewport,
  dragPreview,
  didDragRef,
  onOpenTask,
  onPointerDownBar,
}: {
  bar: TimelineBar;
  task: TaskWithMeta;
  viewport: TimelineViewport;
  dragPreview: { start: Date; end: Date } | null;
  didDragRef: React.MutableRefObject<boolean>;
  onOpenTask: (task: TaskWithMeta) => void;
  onPointerDownBar: (
    e: ReactPointerEvent,
    taskId: string,
    mode: DragMode,
    span: { start: Date; end: Date },
  ) => void;
}) {
  const span = dragPreview ?? { start: bar.start, end: bar.end };
  const previewBar: TimelineBar = { ...bar, start: span.start, end: span.end };
  const { leftPx, widthPx } = barGeometry(previewBar, viewport);
  const top = (ROW_HEIGHT - BAR_HEIGHT) / 2;

  return (
    <div
      className="relative border-b"
      style={{ height: ROW_HEIGHT, width: viewport.totalWidthPx }}
    >
      <button
        type="button"
        className={cn(
          "timeline-bar absolute overflow-hidden border border-white/30 text-left shadow-sm",
          dragPreview && "is-dragging ring-2 ring-primary/40",
        )}
        style={{
          left: leftPx,
          width: Math.max(viewport.pixelsPerDay, widthPx),
          top,
          height: BAR_HEIGHT,
          backgroundColor: bar.color,
        }}
        onClick={() => {
          if (didDragRef.current) {
            didDragRef.current = false;
            return;
          }
          onOpenTask(task);
        }}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetX = e.clientX - rect.left;
          const mode: DragMode =
            offsetX <= 8
              ? "resize-start"
              : offsetX >= rect.width - 8
                ? "resize-end"
                : "move";
          onPointerDownBar(e, bar.id, mode, {
            start: bar.start,
            end: bar.end,
          });
        }}
        title={bar.name}
      >
        <span
          className="pointer-events-none absolute inset-y-0 left-0 bg-black/15"
          style={{ width: `${bar.progress}%` }}
        />
        <span className="pointer-events-none block truncate px-2 py-0.5 text-[11px] font-medium text-white drop-shadow-sm">
          {bar.name}
        </span>
        <span
          className="timeline-bar-handle timeline-bar-handle--start"
          aria-hidden
        />
        <span
          className="timeline-bar-handle timeline-bar-handle--end"
          aria-hidden
        />
      </button>
    </div>
  );
}

export function TimelineChart({
  scheduledTasks,
  zoom,
  onOpenTask,
  onUpdateDates,
}: TimelineChartProps) {
  const bars = useMemo(() => toTimelineBars(scheduledTasks), [scheduledTasks]);
  const taskById = useMemo(
    () => new Map(scheduledTasks.map((t) => [t.id, t])),
    [scheduledTasks],
  );

  const viewport = useMemo(
    () => computeTimelineViewport(bars, zoom),
    [bars, zoom],
  );

  const todayOffset = useMemo(() => todayMarkerOffset(viewport), [viewport]);

  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const chartHeaderRef = useRef<HTMLDivElement>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    taskId: string;
    start: Date;
    end: Date;
  } | null>(null);
  const dragPreviewRef = useRef(dragPreview);

  dragPreviewRef.current = dragPreview;

  const syncHeaderScroll = useCallback(() => {
    const body = bodyScrollRef.current;
    const header = chartHeaderRef.current;
    if (body && header) {
      header.scrollLeft = body.scrollLeft;
    }
  }, []);

  useEffect(() => {
    if (todayOffset === null) return;
    const body = bodyScrollRef.current;
    if (!body) return;
    body.scrollLeft = Math.max(0, todayOffset - body.clientWidth / 3);
  }, [zoom, todayOffset]);

  const handlePointerDownBar = useCallback(
    (
      e: ReactPointerEvent,
      taskId: string,
      mode: DragMode,
      span: { start: Date; end: Date },
    ) => {
      e.preventDefault();
      const chartArea = chartAreaRef.current;
      const body = bodyScrollRef.current;
      if (!chartArea || !body) return;

      const originX = pointerXInChart(
        e.clientX,
        chartArea,
        body.scrollLeft,
      );

      setDrag({
        taskId,
        mode,
        pointerId: e.pointerId,
        originX,
        spanStart: span.start,
        spanEnd: span.end,
      });
      setDragPreview({ taskId, start: span.start, end: span.end });
    },
    [],
  );

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      const chartArea = chartAreaRef.current;
      const body = bodyScrollRef.current;
      if (!chartArea || !body) return;

      const pointerX = pointerXInChart(e.clientX, chartArea, body.scrollLeft);
      const deltaPx = pointerX - drag.originX;
      if (Math.abs(deltaPx) > 2) {
        didDragRef.current = true;
      }

      const deltaDays = Math.round(deltaPx / viewport.pixelsPerDay);
      let nextStart = drag.spanStart;
      let nextEnd = drag.spanEnd;

      if (drag.mode === "move") {
        const shifted = shiftSpanByDays(
          drag.spanStart,
          drag.spanEnd,
          deltaDays,
        );
        nextStart = shifted.start;
        nextEnd = shifted.end;
      } else if (drag.mode === "resize-start") {
        nextStart = dateAtPixel(viewport, pointerX);
        if (nextStart > drag.spanEnd) nextStart = drag.spanEnd;
      } else {
        nextEnd = dateAtPixel(viewport, pointerX);
        if (nextEnd < drag.spanStart) nextEnd = drag.spanStart;
      }

      setDragPreview({
        taskId: drag.taskId,
        start: snapBarSpan(nextStart, nextEnd).start,
        end: snapBarSpan(nextStart, nextEnd).end,
      });
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      const preview = dragPreviewRef.current;
      if (preview && preview.taskId === drag.taskId) {
        finishDrag(drag, preview.start, preview.end);
      }
      setDrag(null);
      setDragPreview(null);
    };

    const finishDrag = (
      state: DragState,
      finalStart: Date,
      finalEnd: Date,
    ) => {
      const snapped = snapBarSpan(finalStart, finalEnd);
      onUpdateDates(
        state.taskId,
        timelineDatesToPatch(snapped.start, snapped.end),
      );
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, onUpdateDates, viewport]);

  return (
    <div className="jiganto-timeline-chart flex h-[min(520px,calc(100vh-320px))] min-h-[360px] flex-col overflow-hidden rounded-lg border bg-background">
      {/* Sticky header */}
      <div className="flex shrink-0 border-b">
        <div
          className="shrink-0 border-r bg-muted/40"
          style={{ width: GRID_LABEL_WIDTH, height: HEADER_HEIGHT }}
        >
          <div className="flex h-[25px] items-end border-b px-3 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Task
          </div>
          <div className="grid h-[25px] grid-cols-[1fr_72px_72px] items-center gap-1 px-2 text-[10px] font-medium text-muted-foreground">
            <span />
            <span className="text-center">Start</span>
            <span className="text-center">Due</span>
          </div>
        </div>
        <div
          ref={chartHeaderRef}
          className="min-w-0 flex-1 overflow-hidden bg-muted/40"
          style={{ height: HEADER_HEIGHT }}
        >
          <div style={{ width: viewport.totalWidthPx }}>
            <ScaleRow cells={viewport.primaryRow} />
            <ScaleRow cells={viewport.secondaryRow} />
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div
        ref={bodyScrollRef}
        className="min-h-0 flex-1 overflow-auto"
        onScroll={syncHeaderScroll}
      >
        <div className="flex">
          <div
            className="shrink-0 border-r bg-background"
            style={{ width: GRID_LABEL_WIDTH }}
          >
            {scheduledTasks.map((task) => {
              const span = resolveTaskSpan(task);
              return (
                <div
                  key={task.id}
                  className="grid grid-cols-[1fr_72px_72px] items-center gap-1 border-b px-2"
                  style={{ height: ROW_HEIGHT }}
                >
                  <button
                    type="button"
                    onClick={() => onOpenTask(task)}
                    className="truncate text-left text-xs font-medium hover:text-primary hover:underline"
                  >
                    {task.name}
                  </button>
                  <span className="truncate text-center font-mono text-[10px] text-muted-foreground">
                    {span ? format(span.start, "d MMM") : "—"}
                  </span>
                  <span className="truncate text-center font-mono text-[10px] text-muted-foreground">
                    {span ? format(span.end, "d MMM") : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            ref={chartAreaRef}
            data-timeline-chart-area
            className="relative shrink-0"
            style={{
              width: viewport.totalWidthPx,
              minHeight: Math.max(ROW_HEIGHT, bars.length * ROW_HEIGHT),
            }}
          >
            {todayOffset !== null && (
              <div
                className="timeline-today-line pointer-events-none absolute inset-y-0 z-10 w-px bg-primary opacity-75"
                style={{ left: todayOffset }}
              >
                <span className="timeline-today-label">Today</span>
              </div>
            )}

            {bars.map((bar) => {
              const task = taskById.get(bar.id);
              if (!task) return null;
              const preview =
                dragPreview?.taskId === bar.id ? dragPreview : null;
              return (
                <TimelineBarRow
                  key={bar.id}
                  bar={bar}
                  task={task}
                  viewport={viewport}
                  dragPreview={preview}
                  didDragRef={didDragRef}
                  onOpenTask={onOpenTask}
                  onPointerDownBar={handlePointerDownBar}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
