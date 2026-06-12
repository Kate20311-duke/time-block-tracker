"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { FileUp, Loader2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { countImportableEvents } from "@/lib/import/duplicate-detection";
import type { IcsApplyResult } from "@/lib/import/ics-apply-types";
import type {
  IcsImportCheckStatus,
  IcsPreviewResult,
  ParsedIcsEvent,
} from "@/lib/import/ics-types";
import type { Dictionary, Locale } from "@/lib/i18n/types";

export type IcsImportCategoryOption = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  labels: Dictionary["settings"]["import"];
  locale: Locale;
  timeZone: string;
  categories: IcsImportCategoryOption[];
};

function parserStatusBadgeVariant(
  status: ParsedIcsEvent["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "supported") return "default";
  if (status === "warning") return "outline";
  return "destructive";
}

function importStatusBadgeVariant(
  status: IcsImportCheckStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ready") return "default";
  if (status === "conflict") return "outline";
  if (status === "duplicate" || status === "batch_duplicate") return "secondary";
  return "destructive";
}

function formatPreviewInstant(
  value: string,
  isAllDay: boolean,
  timeZone: string,
  locale: Locale,
): string {
  if (isAllDay || !value.includes("T")) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

function reasonLabel(
  code: string,
  labels: Dictionary["settings"]["import"],
): string {
  const previewMap = labels.reasons as Record<string, string | undefined>;
  const skipMap = labels.skipReasons as Record<string, string | undefined>;
  const checkMap = labels.checkReasons as Record<string, string | undefined>;
  return previewMap[code] ?? skipMap[code] ?? checkMap[code] ?? code;
}

function importStatusLabel(
  status: IcsImportCheckStatus | undefined,
  labels: Dictionary["settings"]["import"],
): string {
  if (!status) {
    return "—";
  }
  return labels.importStatus[status];
}

export function IcsImportPreviewSection({
  labels,
  locale,
  timeZone,
  categories,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<IcsPreviewResult | null>(null);
  const [importResult, setImportResult] = useState<IcsApplyResult | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [includeConflicts, setIncludeConflicts] = useState(false);

  const selectedCategory = categories.find((category) => category.id === categoryId);

  const importableCount = useMemo(() => {
    if (!preview) {
      return 0;
    }
    return countImportableEvents(preview.events, includeConflicts);
  }, [preview, includeConflicts]);

  const canImport =
    Boolean(preview) &&
    Boolean(categoryId) &&
    importableCount > 0 &&
    !previewLoading &&
    !importLoading;

  async function handlePreview() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError(labels.errors.missingFile);
      setPreview(null);
      setImportResult(null);
      return;
    }

    if (!categoryId) {
      setError(labels.errors.missingCategoryPreview);
      setPreview(null);
      setImportResult(null);
      return;
    }

    setPreviewLoading(true);
    setError(null);
    setPreview(null);
    setImportResult(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("categoryId", categoryId);

      const response = await fetch("/api/import/ics/preview", {
        method: "POST",
        body: formData,
      });

      const body = (await response.json()) as IcsPreviewResult & {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(resolvePreviewApiError(body, labels));
        return;
      }

      setPreview(body);
    } catch {
      setError(labels.errors.generic);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleImport() {
    if (!preview || !categoryId || importableCount === 0) {
      return;
    }

    setImportLoading(true);
    setError(null);
    setImportResult(null);

    try {
      const response = await fetch("/api/import/ics/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          includeConflicts,
          events: preview.events.map((event) => ({
            id: event.id,
            summary: event.summary,
            description: event.description,
            location: event.location,
            start: event.start,
            end: event.end,
            isAllDay: event.isAllDay,
            status: event.status,
          })),
        }),
      });

      const body = (await response.json()) as IcsApplyResult & {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(resolveApplyApiError(body, labels));
        return;
      }

      setImportResult(body);
    } catch {
      setError(labels.errors.importFailed);
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.sectionTitle}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{labels.importNotice}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>{labels.supportedOnlyNote}</li>
          <li>{labels.recurringSkippedNote}</li>
          <li>{labels.duplicateSkippedNote}</li>
          <li>{labels.conflictSkippedNote}</li>
          <li>{labels.conflictOptionalNote}</li>
          <li>{labels.noOverwriteNote}</li>
        </ul>

        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {labels.noCategories}{" "}
            <Link href="/categories" className="text-primary underline-offset-4 hover:underline">
              {labels.createCategoryLink}
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            <label htmlFor="ics-import-category" className="text-sm font-medium">
              {labels.categoryLabel}
            </label>
            <select
              id="ics-import-category"
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setPreview(null);
                setImportResult(null);
              }}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{labels.selectCategory}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label htmlFor="ics-file" className="text-sm font-medium">
              {labels.fileLabel}
            </label>
            <input
              ref={inputRef}
              id="ics-file"
              type="file"
              accept=".ics,text/calendar"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              onChange={() => {
                setError(null);
                setPreview(null);
                setImportResult(null);
                setFileName(inputRef.current?.files?.[0]?.name ?? null);
              }}
            />
          </div>
          <Button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading || importLoading || !categoryId}
            className="shrink-0"
          >
            {previewLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <FileUp className="size-4" aria-hidden />
            )}
            {previewLoading ? labels.previewing : labels.previewButton}
          </Button>
        </div>

        {fileName ? (
          <p className="text-sm text-muted-foreground">
            {labels.selectedFile}: {fileName}
            {selectedCategory ? ` · ${selectedCategory.name}` : null}
          </p>
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeConflicts}
            onChange={(event) => setIncludeConflicts(event.target.checked)}
            className="size-4 rounded border"
          />
          {labels.includeConflictsLabel}
        </label>

        <Button
          type="button"
          onClick={handleImport}
          disabled={!canImport}
          className="w-full sm:w-auto"
        >
          {importLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          {importLoading ? labels.importing : labels.importButton}
        </Button>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {importResult ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            <p className="font-medium">
              {labels.importSuccessSummary
                .replace("{imported}", String(importResult.importedCount))
                .replace("{skipped}", String(importResult.skippedCount))}
            </p>
            <p className="mt-1">
              {labels.importDetailedSummary
                .replace("{duplicate}", String(importResult.duplicateCount))
                .replace("{batchDuplicate}", String(importResult.batchDuplicateCount))
                .replace("{conflictSkipped}", String(importResult.conflictSkippedCount))
                .replace("{conflictImported}", String(importResult.conflictImportedCount))
                .replace("{invalid}", String(importResult.invalidCount))
                .replace("{unsupported}", String(importResult.unsupportedCount))}
            </p>
            {importResult.skipped.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {importResult.skipped.slice(0, 5).map((item, index) => (
                  <li key={`${item.summary}-${index}`}>
                    {item.summary}: {reasonLabel(item.reason, labels)}
                  </li>
                ))}
                {importResult.skipped.length > 5 ? (
                  <li>{labels.moreSkipped.replace("{count}", String(importResult.skipped.length - 5))}</li>
                ) : null}
              </ul>
            ) : null}
          </div>
        ) : null}

        {preview ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">
                {labels.summaryTotal}: {preview.summary.total}
              </Badge>
              <Badge variant="default">
                {labels.summarySupported}: {preview.summary.supported}
              </Badge>
              <Badge variant="outline">
                {labels.summaryWarning}: {preview.summary.warning}
              </Badge>
              <Badge variant="destructive">
                {labels.summaryUnsupported}: {preview.summary.unsupported}
              </Badge>
            </div>

            {preview.summary.importCheck ? (
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="default">
                  {labels.summaryReady}: {preview.summary.importCheck.ready}
                </Badge>
                <Badge variant="secondary">
                  {labels.summaryDuplicate}: {preview.summary.importCheck.duplicate}
                </Badge>
                <Badge variant="secondary">
                  {labels.summaryBatchDuplicate}: {preview.summary.importCheck.batch_duplicate}
                </Badge>
                <Badge variant="outline">
                  {labels.summaryConflict}: {preview.summary.importCheck.conflict}
                </Badge>
                <Badge variant="destructive">
                  {labels.summaryInvalid}: {preview.summary.importCheck.invalid}
                </Badge>
                <Badge variant="destructive">
                  {labels.summaryImportUnsupported}: {preview.summary.importCheck.unsupported}
                </Badge>
              </div>
            ) : null}

            {preview.truncated ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {labels.truncatedNotice}
              </p>
            ) : null}

            {preview.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">{labels.emptyEvents}</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 font-medium">{labels.colSummary}</th>
                      <th className="px-3 py-2 font-medium">{labels.colStart}</th>
                      <th className="px-3 py-2 font-medium">{labels.colEnd}</th>
                      <th className="px-3 py-2 font-medium">{labels.colLocation}</th>
                      <th className="px-3 py-2 font-medium">{labels.colImportStatus}</th>
                      <th className="px-3 py-2 font-medium">{labels.colParserStatus}</th>
                      <th className="px-3 py-2 font-medium">{labels.colConflicts}</th>
                      <th className="px-3 py-2 font-medium">{labels.colNotes}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.events.map((event) => (
                      <tr key={event.id} className="border-t">
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium">{event.summary}</div>
                          {event.categories.length > 0 ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {event.categories.join(", ")}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          {formatPreviewInstant(
                            event.start,
                            event.isAllDay,
                            timeZone,
                            locale,
                          )}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          {event.end
                            ? formatPreviewInstant(
                                event.end,
                                event.isAllDay,
                                timeZone,
                                locale,
                              )
                            : "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                          {event.location?.trim() || "—"}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {event.importCheck ? (
                            <Badge variant={importStatusBadgeVariant(event.importCheck.status)}>
                              {importStatusLabel(event.importCheck.status, labels)}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Badge variant={parserStatusBadgeVariant(event.status)}>
                            {labels.status[event.status]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                          {event.importCheck?.conflicts?.length
                            ? event.importCheck.conflicts
                                .map(
                                  (conflict) =>
                                    `${conflict.title} (${conflict.categoryName})`,
                                )
                                .join(" · ")
                            : "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                          {[
                            ...event.unsupportedReasons,
                            ...event.warnings,
                            ...(event.importCheck?.reasons ?? []),
                          ]
                            .map((code) => reasonLabel(code, labels))
                            .join(" · ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function resolvePreviewApiError(
  body: { error?: string; message?: string },
  labels: Dictionary["settings"]["import"],
): string {
  const code = body.error ?? "";
  const map: Record<string, string> = {
    UNAUTHORIZED: labels.errors.unauthorized,
    MISSING_FILE: labels.errors.missingFile,
    INVALID_FILE_TYPE: labels.errors.invalidType,
    FILE_TOO_LARGE: labels.errors.tooLarge,
    EMPTY: labels.errors.empty,
    INVALID_ICS: labels.errors.invalidIcs,
    INVALID_CATEGORY: labels.errors.invalidCategory,
  };
  return map[code] ?? body.message ?? labels.errors.generic;
}

function resolveApplyApiError(
  body: { error?: string; message?: string },
  labels: Dictionary["settings"]["import"],
): string {
  const code = body.error ?? "";
  const map: Record<string, string> = {
    UNAUTHORIZED: labels.errors.unauthorized,
    MISSING_CATEGORY: labels.errors.missingCategory,
    MISSING_EVENTS: labels.errors.missingEvents,
    INVALID_CATEGORY: labels.errors.invalidCategory,
    INVALID_EVENTS: labels.errors.invalidEvents,
    TOO_MANY_EVENTS: labels.errors.tooManyEvents,
    IMPORT_FAILED: labels.errors.importFailed,
  };
  return map[code] ?? body.message ?? labels.errors.importFailed;
}
