"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  datetimeLocalValueToUtcIso,
  instantToDatetimeLocalValue,
} from "@/lib/datetime-local-iso";

type Props = {
  startLabel: string;
  endLabel: string;
  /** IANA timezone for edit defaults (from cookie / server). */
  timeZone: string;
  startTimeIso?: string;
  endTimeIso?: string;
  inputClassName?: string;
  /**
   * Parent form id — registers capture-phase submit listener to sync hidden ISO
   * fields before FormData is sent (needed when the form is a Server Component).
   */
  formId?: string;
};

function resolveInitialLocal(
  iso: string | undefined,
  timeZone: string,
): string {
  if (!iso) return "";
  return instantToDatetimeLocalValue(iso, timeZone);
}

function resolveInitialIso(
  iso: string | undefined,
  local: string,
): string {
  if (iso) return iso;
  if (!local) return "";
  return datetimeLocalValueToUtcIso(local) ?? "";
}

export function TimeBlockDatetimeFields({
  startLabel,
  endLabel,
  timeZone,
  startTimeIso,
  endTimeIso,
  inputClassName = "rounded border border-zinc-300 px-3 py-2",
  formId,
}: Props) {
  const startIsoRef = useRef<HTMLInputElement>(null);
  const endIsoRef = useRef<HTMLInputElement>(null);

  const initialStartLocal = useMemo(
    () => resolveInitialLocal(startTimeIso, timeZone),
    [startTimeIso, timeZone],
  );
  const initialEndLocal = useMemo(
    () => resolveInitialLocal(endTimeIso, timeZone),
    [endTimeIso, timeZone],
  );

  const [startLocal, setStartLocal] = useState(initialStartLocal);
  const [endLocal, setEndLocal] = useState(initialEndLocal);
  const [startIso, setStartIso] = useState(() =>
    resolveInitialIso(startTimeIso, initialStartLocal),
  );
  const [endIso, setEndIso] = useState(() =>
    resolveInitialIso(endTimeIso, initialEndLocal),
  );

  const syncIsoToHiddenInputs = useCallback((): boolean => {
    const start = datetimeLocalValueToUtcIso(startLocal);
    const end = datetimeLocalValueToUtcIso(endLocal);
    if (!start || !end) {
      return false;
    }
    if (startIsoRef.current) {
      startIsoRef.current.value = start;
    }
    if (endIsoRef.current) {
      endIsoRef.current.value = end;
    }
    setStartIso(start);
    setEndIso(end);
    return true;
  }, [startLocal, endLocal]);

  const syncStart = useCallback((value: string) => {
    setStartLocal(value);
    setStartIso(datetimeLocalValueToUtcIso(value) ?? "");
  }, []);

  const syncEnd = useCallback((value: string) => {
    setEndLocal(value);
    setEndIso(datetimeLocalValueToUtcIso(value) ?? "");
  }, []);

  useEffect(() => {
    if (!formId) return;
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    const onCapture = (event: Event) => {
      if (!(event instanceof SubmitEvent)) return;
      if (!syncIsoToHiddenInputs()) {
        event.preventDefault();
      }
    };

    form.addEventListener("submit", onCapture, true);
    return () => form.removeEventListener("submit", onCapture, true);
  }, [formId, syncIsoToHiddenInputs]);

  return (
    <>
      <input
        ref={startIsoRef}
        type="hidden"
        name="startTimeIso"
        value={startIso}
        readOnly
      />
      <input
        ref={endIsoRef}
        type="hidden"
        name="endTimeIso"
        value={endIso}
        readOnly
      />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{startLabel}</span>
        <input
          name="startTime"
          type="datetime-local"
          required
          value={startLocal}
          onChange={(e) => syncStart(e.target.value)}
          className={inputClassName}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{endLabel}</span>
        <input
          name="endTime"
          type="datetime-local"
          required
          value={endLocal}
          onChange={(e) => syncEnd(e.target.value)}
          className={inputClassName}
        />
      </label>
    </>
  );
}
