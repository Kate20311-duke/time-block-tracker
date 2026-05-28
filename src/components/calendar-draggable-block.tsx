"use client";

import { useRef, useState } from "react";
import { updateTimeBlockSchedule } from "@/lib/actions/calendar-time-blocks";
import {
  CALENDAR_GRID_HEIGHT_PX,
  calculateResizedRange,
  calculateMovedRange,
  parseCalendarDateParam,
  pixelYToMinutes,
} from "@/lib/calendar";

const DRAG_THRESHOLD_PX = 5;
const RESIZE_HANDLE_HEIGHT_PX = 10;

type Props = {
  blockId: string;
  startTimeIso: string;
  endTimeIso: string;
  calendarDate: string;
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  title: string;
  categoryName: string;
  color: string;
  timeLabel: string;
  topPercent: number;
  heightPercent: number;
  isSelected?: boolean;
  compact?: boolean;
  onSelect: (blockId: string) => void;
  onSaveEnd: (ok: boolean) => void;
};

export function CalendarDraggableBlock({
  blockId,
  startTimeIso,
  endTimeIso,
  calendarDate,
  gridContainerRef,
  title,
  categoryName,
  color,
  timeLabel,
  topPercent,
  heightPercent,
  isSelected = false,
  compact = false,
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

  const originalStart = new Date(startTimeIso);
  const originalEnd = new Date(endTimeIso);
  const selectedDay = parseCalendarDateParam(calendarDate);

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

    const container = gridContainerRef.current;
    if (!container) {
      setDragOffsetPx(0);
      onSaveEnd(false);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const newTopPx = clientY - containerRect.top - grabOffsetYRef.current;
    const targetStartMinutes = pixelYToMinutes(newTopPx, CALENDAR_GRID_HEIGHT_PX);

    const moved = calculateMovedRange(
      originalStart,
      originalEnd,
      targetStartMinutes,
      selectedDay,
    );

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
    const targetEndMinutes = pixelYToMinutes(targetEndYpx, CALENDAR_GRID_HEIGHT_PX);

    const resized = calculateResizedRange(
      originalStart,
      targetEndMinutes,
      selectedDay,
    );

    setResizeOffsetPx(0);

    if (!resized.ok) {
      onSaveEnd(false);
      return;
    }

    await saveSchedule(resized.startTime, resized.endTime);
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
        initialTopPxRef.current = (topPercent / 100) * CALENDAR_GRID_HEIGHT_PX;
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

        const container = gridContainerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const newTopPx =
          e.clientY - containerRect.top - grabOffsetYRef.current;
        setDragOffsetPx(newTopPx - initialTopPxRef.current);
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
      className={`absolute overflow-hidden rounded border text-left text-white shadow-sm hover:brightness-95 ${
        isDragging || isResizing || isSaving ? "z-20" : ""
      } ${isSelected ? "z-10" : ""} touch-none ${
        isDragging
          ? "cursor-grabbing opacity-90 ring-2 ring-white/40"
          : isResizing
            ? "cursor-ns-resize opacity-90 ring-2 ring-white/40"
            : isSaving
            ? "cursor-wait opacity-80"
            : "cursor-grab"
      } ${compact ? "right-0.5 left-0.5 px-1 py-0.5" : "right-1 left-1 px-2 py-1"} ${
        isSelected
          ? "border-zinc-900 ring-2 ring-zinc-900 ring-offset-1"
          : "border-white/25"
      }`}
      style={{
        top: `${topPercent}%`,
        height: resizeOffsetPx
          ? `calc(${heightPercent}% + ${resizeOffsetPx}px)`
          : `${heightPercent}%`,
        minHeight: "1.25rem",
        backgroundColor: color,
        transform: dragOffsetPx ? `translateY(${dragOffsetPx}px)` : undefined,
      }}
      title={`${title} · ${categoryName} · ${timeLabel}`}
      aria-pressed={isSelected}
      aria-grabbed={isDragging}
      aria-label={`${title}, ${categoryName}, ${timeLabel}`}
    >
      <p
        className={`pointer-events-none truncate font-semibold leading-tight ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        {title}
      </p>
      {!compact ? (
        <p className="pointer-events-none truncate text-[10px] leading-tight opacity-90">
          {timeLabel}
        </p>
      ) : null}

      <span
        role="presentation"
        className="absolute right-0 bottom-0 left-0 cursor-ns-resize bg-white/20 hover:bg-white/30"
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
          initialTopPxRef.current = (topPercent / 100) * CALENDAR_GRID_HEIGHT_PX;
          initialHeightPxRef.current = (heightPercent / 100) * CALENDAR_GRID_HEIGHT_PX;

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
    </button>
  );
}
