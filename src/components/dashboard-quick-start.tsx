"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { startStopwatch } from "@/lib/actions/focus-sessions";
import { rejectStopwatchStartWhenActive } from "@/lib/actions/focus-shared";
import type { Dictionary } from "@/lib/i18n/types";

export type QuickStartCategory = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  categories: QuickStartCategory[];
  hasActiveSession: boolean;
  labels: Pick<
    Dictionary["dashboard"],
    "quickStart" | "quickStartHint" | "customTimer" | "quickStartActiveSession"
  > &
    Pick<Dictionary["focus"], "stopwatchStart" | "errors">;
};

export function DashboardQuickStart({
  categories,
  hasActiveSession,
  labels,
}: Props) {
  const router = useRouter();
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null);
  const items = categories.slice(0, 4);

  const handleQuickStart = async (category: QuickStartCategory) => {
    const blocked = rejectStopwatchStartWhenActive(hasActiveSession);
    if (blocked) {
      toast.error(labels.quickStartActiveSession);
      return;
    }

    setBusyCategoryId(category.id);
    const result = await startStopwatch({
      categoryId: category.id,
      title: category.name,
    });
    setBusyCategoryId(null);

    if (!result.ok) {
      if (result.error === "session_already_running") {
        toast.error(labels.quickStartActiveSession);
      } else {
        toast.error(labels.errors.generic);
      }
      return;
    }

    toast.success(labels.stopwatchStart);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.quickStart}</CardTitle>
        <CardDescription>{labels.quickStartHint}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {items.length === 0 ? (
          <p className="col-span-2 text-sm text-muted-foreground">—</p>
        ) : (
          items.map((category) => (
            <Button
              key={category.id}
              variant="outline"
              className="h-auto flex-col items-start gap-2 py-3"
              disabled={busyCategoryId === category.id}
              onClick={() => handleQuickStart(category)}
            >
              <span className="flex w-full items-center justify-between">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <Play className="size-3.5 text-muted-foreground" />
              </span>
              <span className="text-sm font-medium">{category.name}</span>
            </Button>
          ))
        )}
      </CardContent>
      <CardFooter>
        <Button variant="ghost" className="w-full" asChild>
          <Link href="/focus?mode=stopwatch">
            <Plus data-icon="inline-start" />
            {labels.customTimer}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
