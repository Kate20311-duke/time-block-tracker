import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Action = {
  label: string;
  href: string;
  variant?: "default" | "outline";
};

type Props = {
  title: string;
  description: string;
  actions?: Action[];
  children?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actions,
  children,
  className,
}: Props) {
  return (
    <Card className={`border-dashed ${className ?? ""}`}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {actions?.length || children ? (
        <CardContent className="flex flex-wrap gap-2">
          {actions?.map((action) => (
            <Button
              key={action.href}
              variant={action.variant ?? "default"}
              asChild
            >
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
          {children}
        </CardContent>
      ) : null}
    </Card>
  );
}
