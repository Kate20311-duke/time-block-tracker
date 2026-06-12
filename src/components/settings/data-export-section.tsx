"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/types";

type Props = {
  labels: Dictionary["settings"]["export"];
  initialFrom: string;
  initialTo: string;
};

function buildExportUrl(path: string, from: string, to: string): string {
  const params = new URLSearchParams();
  if (from.trim()) params.set("from", from.trim());
  if (to.trim()) params.set("to", to.trim());
  const query = params.toString();
  return `${path}${query ? `?${query}` : ""}`;
}

export function DataExportSection({ labels, initialFrom, initialTo }: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const csvDownloadUrl = useMemo(
    () => buildExportUrl("/api/export/time-blocks.csv", from, to),
    [from, to],
  );

  const excelDownloadUrl = useMemo(
    () => buildExportUrl("/api/export/time-blocks.xlsx", from, to),
    [from, to],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.sectionTitle}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{labels.timezoneNote}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="export-from" className="text-sm font-medium">
              {labels.fromLabel}
            </label>
            <Input
              id="export-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="export-to" className="text-sm font-medium">
              {labels.toLabel}
            </label>
            <Input
              id="export-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="default">
            <a href={csvDownloadUrl} download>
              <Download className="size-4" aria-hidden />
              {labels.downloadCsvButton}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={excelDownloadUrl} download>
              <Download className="size-4" aria-hidden />
              {labels.downloadExcelButton}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
