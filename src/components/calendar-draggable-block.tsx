"use client";

import { useRef, useState, type CSSProperties } from "react";
import { updateTimeBlockSchedule } from "@/lib/actions/calendar-time-blocks";
import { CalendarBlockCardContent } from "@/components/calendar-block-card";
import {
  CALENDAR_GRID_HEIGHT_PX,
  calculateMovedRange,
  calculateResizedRange,
  calculateSnappedDragTopPx,
  parseCalendarDateParam,
  pixelYToMinutes,
  snapMinutes,
  type DayBlockLayout,
} from "@/lib/calendar";
import { calendarBlockPositionStyle } from "@/lib/calendar-block-style";
import type { Locale } from "@/lib/i18n/types";

const DRAG_THRESHOLD_PX = 5;
const RESIZE_HANDLE_HEIGHT_PX = 10;

type Props = {
  blockId: string;
  visibleStartIso: string;
  visibleEndIso: string;
  calendarDate: string;
  userTimeZone: string;
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  title: string;
  categoryName: string;
  color: string;
  timeLabel: string;
  layout: DayBlockLayout;
  locale: Locale;
  status?: string;
  completionLevel?: number;
  completionLabel?: string;
  isSelected?: boolean;
  compact?: boolean;
  enableResize?: boolean;
  onSelect: (blockId: string) => void;
  onSaveEnd: (ok: boolean) => void;
};

export function CalendarDraggableBlock({
  blockId,
  visibleStartIso,
  visibleEndIso,
  calendarDate,
  userTimeZone,
  gridContainerRef,
  title,
  categoryName,
  color,
  timeLabel,
  layout,
  locale,
  status,
  completionLevel,
  completionLabel,
  isSelected = false,
  compact = false,
  enableResize = true,
  onSelect,
  onSaveEnd,
}: Props) {
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeOffsetPx, setResizeOffsetPx] = useState(0);
  const [isResizing, setIsResizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const dragStartedRef = useRef(false);
  const resizeStartedRef = useRef(false);
  const resizingRef = useRef(false);
  const grabOffsetYRef = useRef(0);
  const startClientYRef = useRef(0);
  const startClientXRef = useRef(0);
  const initialTopPxRef = useRef(0);
  const initialHeightPxRef = useRef(0);

  const segmentStart = new Date(visibleStartIso);
  const segmentEnd = new Date(visibleEndIso);
  const selectedDay = parseCalendarDateParam(calendarDate, userTimeZone);
  const position = calendarBlockPositionStyle(layout);

  const blockTopPxInGrid = (clientY: number, container: HTMLElement) => {
    const containerRect = container.getBoundingClientRect();
    return clientY - containerRect.top - grabOffsetYRef.current;
  };

  const movedRangeFromPointer = (clientY: number) => {
    const container = gridContainerRef.current;
    if (!container) {
      return { ok: false as const };
    }
    const topPx = blockTopPxInGrid(clientY, container);
    const targetStartMinutes = snapMinutes(
      pixelYToMinutes(topPx, CALENDAR_GRID_HEIGHT_PX),
    );
    return calculateMovedRange(
      segmentStart,
      segmentEnd,
      targetStartMinutes,
      selectedDay,
      undefined,
      userTimeZone,
    );
  };

  const updateDragPreview = (clientY: number) => {
    const container = gridContainerRef.current;
    if (!container) return;

    const topPx = blockTopPxInGrid(clientY, container);
    const snappedTopPx = calculateSnappedDragTopPx(
      topPx,
      segmentStart,
      segmentEnd,
      selectedDay,
      CALENDAR_GRID_HEIGHT_PX,
      userTimeZone,
    );
    if (snappedTopPx === null) {
      return;
    }
    setDragOffsetPx(snappedTopPx - initialTopPxRef.current);
  };

  const clearBodyDragStyles = () => {
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  };

  const saveSchedule = async (startTime: Date, endTime: Date) => {
    setIsSaving(true);
    try {
      const result = await updateTimeBlockSchedule({
        id: blockId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      onSaveEnd(result.ok);
    } catch {
      onSaveEnd(false);
    } finally {
      setIsSaving(false);
    }
  };

  const finishMove = async (el: HTMLElement, pointerId: number, clientY: number) => {
    if (el.hasPointerCapture(pointerId)) {
      el.releasePointerCapture(pointerId);
    }
    clearBodyDragStyles();

    if (!dragStartedRef.current) {
      setDragOffsetPx(0);
      onSelect(blockId);
      return;
    }

    dragStartedRef.current = false;
    setIsDragging(false);

    const moved = movedRangeFromPointer(clientY);

    setDragOffsetPx(0);

    if (!moved.ok) {
      onSaveEnd(false);
      return;
    }

    await saveSchedule(moved.startTime, moved.endTime);
  };

  const finishResize = async (
    handleEl: HTMLElement,
    pointerId: number,
    clientY: number,
  ) => {
    if (handleEl.hasPointerCapture(pointerId)) {
      handleEl.releasePointerCapture(pointerId);
    }
    clearBodyDragStyles();

    resizingRef.current = false;

    if (!resizeStartedRef.current) {
      setResizeOffsetPx(0);
      setIsResizing(false);
      return;
    }

    resizeStartedRef.current = false;
    setIsResizing(false);

    const container = gridContainerRef.current;
    if (!container) {
      setResizeOffsetPx(0);
      onSaveEnd(false);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const newHeightPx =
      clientY -
      containerRect.top -
      initialTopPxRef.current -
      initialHeightPxRef.current;
    const targetEndYpx = initialTopPxRef.current + initialHeightPxRef.current + newHeightPx;
    const targetEndMinutes = snapMinutes(
      pixelYToMinutes(targetEndYpx, CALENDAR_GRID_HEIGHT_PX),
    );

    const resized = calculateResizedRange(
      segmentStart,
      targetEndMinutes,
      selectedDay,
      undefined,
      userTimeZone,
    );

    setResizeOffsetPx(0);

    if (!resized.ok) {
      onSaveEnd(false);
      return;
    }

    await saveSchedule(resized.startTime, resized.endTime);
  };

  const positionStyle: CSSProperties = {
    ...position,
    height: resizeOffsetPx
      ? `calc(${layout.heightPercent}% + ${resizeOffsetPx}px)`
      : position.height,
    transform: dragOffsetPx ? `translateY(${dragOffsetPx}px)` : undefined,
    zIndex:
      isDragging || isResizing || isSaving
        ? 20
        : isSelected
          ? 10
          : layout.columnIndex + 1,
  };

  return (
    <button
      type="button"
      disabled={isSaving}
      onPointerDown={(e) => {
        if (e.button !== 0 || isSaving) return;
        if (resizingRef.current) return;

        const container = gridContainerRef.current;
        if (!container) return;

        const blockRect = e.currentTarget.getBoundingClientRect();
        grabOffsetYRef.current = e.clientY - blockRect.top;
        startClientYRef.current = e.clientY;
        startClientXRef.current = e.clientX;
        initialTopPxRef.current = (layout.topPercent / 100) * CALENDAR_GRID_HEIGHT_PX;
        dragStartedRef.current = false;
        setDragOffsetPx(0);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId) || isSaving) {
          return;
        }
        if (resizingRef.current) return;

        const deltaY = e.clientY - startClientYRef.current;
        const deltaX = e.clientX - startClientXRef.current;

        if (!dragStartedRef.current) {
          if (
            Math.abs(deltaY) < DRAG_THRESHOLD_PX &&
            Math.abs(deltaX) < DRAG_THRESHOLD_PX
          ) {
            return;
          }
          dragStartedRef.current = true;
          setIsDragging(true);
          document.body.style.userSelect = "none";
          document.body.style.cursor = "grabbing";
        }

        updateDragPreview(e.clientY);
      }}
      onPointerUp={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        if (resizingRef.current) return;
        void finishMove(e.currentTarget, e.pointerId, e.clientY);
      }}
      onPointerCancel={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        dragStartedRef.current = false;
        setIsDragging(false);
        setDragOffsetPx(0);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        clearBodyDragStyles();
      }}
      className={`absolute overflow-hidden border-0 bg-transparent p-0 text-left touch-none ${
        isDragging
          ? "cursor-grabbing"
          : isResizing
            ? "cursor-ns-resize"
            : isSaving
            ? "cursor-wait"
            : "cursor-grab"
      }`}
      style={positionStyle}
      aria-pressed={isSelected}
      aria-grabbed={isDragging}
      aria-label={`${title}, ${categoryName}, ${timeLabel}`}
    >
      <CalendarBlockCardContent
        title={title}
        categoryName={categoryName}
        color={color}
        timeLabel={timeLabel}
        locale={locale}
        status={status}
        completionLevel={completionLevel}
        completionLabel={completionLabel}
        compact={compact}
        isSelected={isSelected}
        className={`h-full ${
          isDragging || isResizing || isSaving ? "opacity-90 ring-2 ring-primary/30" : ""
        }`}
      />

      {enableResize ? (
      <span
        role="presentation"
        className="absolute right-0 bottom-0 left-0 cursor-ns-resize bg-primary/10 hover:bg-primary/20"
        style={{ height: RESIZE_HANDLE_HEIGHT_PX }}
        onPointerDown={(e) => {
          if (e.button !== 0 || isSaving) return;
          e.stopPropagation();
          e.preventDefault();

          const container = gridContainerRef.current;
          if (!container) return;

          resizingRef.current = true;
          resizeStartedRef.current = false;
          setIsResizing(false);
          setResizeOffsetPx(0);

          startClientYRef.current = e.clientY;
          initialTopPxRef.current = (layout.topPercent / 100) * CALENDAR_GRID_HEIGHT_PX;
          initialHeightPxRef.current =
            (layout.heightPercent / 100) * CALENDAR_GRID_HEIGHT_PX;

          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId) || isSaving) {
            return;
          }
          e.stopPropagation();
          e.preventDefault();

          const deltaY = e.clientY - startClientYRef.current;
          if (!resizeStartedRef.current) {
            if (Math.abs(deltaY) < DRAG_THRESHOLD_PX) {
              return;
            }
            resizeStartedRef.current = true;
            setIsResizing(true);
            document.body.style.userSelect = "none";
            document.body.style.cursor = "ns-resize";
          }

          setResizeOffsetPx(deltaY);
        }}
        onPointerUp={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          e.stopPropagation();
          e.preventDefault();
          void finishResize(e.currentTarget, e.pointerId, e.clientY);
        }}
        onPointerCancel={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          e.stopPropagation();
          e.preventDefault();
          resizingRef.current = false;
          resizeStartedRef.current = false;
          setIsResizing(false);
          setResizeOffsetPx(0);
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
          clearBodyDragStyles();
        }}
        aria-hidden
      />
      ) : null}
    </button>
  );
}
