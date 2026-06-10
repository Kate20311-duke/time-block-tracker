import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

export type OnboardingStep = {
  id: string;
  done: boolean;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
};

type Props = {
  steps: OnboardingStep[];
  labels: Dictionary["onboarding"];
};

export function DashboardOnboardingCard({ steps, labels }: Props) {
  const allDone = steps.every((step) => step.done);
  if (allDone) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between",
              step.done && "opacity-70",
            )}
          >
            <div className="flex gap-3">
              {step.done ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {labels.stepLabel.replace("{n}", String(index + 1))}{" "}
                  {step.title}
                </p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {!step.done ? (
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link href={step.href}>{step.actionLabel}</Link>
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
