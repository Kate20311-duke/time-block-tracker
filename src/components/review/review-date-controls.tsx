import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/types";

type Props = {
  mode: "day" | "week";
  dateParam: string;
  calendarHref: string;
  labels: Pick<
    Dictionary["review"],
    "selectDate" | "selectWeek" | "view" | "backToCalendar" | "backToDashboard"
  >;
};

export function ReviewDateControls({
  mode,
  dateParam,
  calendarHref,
  labels,
}: Props) {
  return (
    <Card>
      <CardContent className="pt-6">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <label htmlFor="review-date" className="text-sm font-medium">
              {mode === "day" ? labels.selectDate : labels.selectWeek}
            </label>
            <Input
              id="review-date"
              name="date"
              type="date"
              defaultValue={dateParam}
              className="w-auto min-w-[10rem]"
            />
          </div>
          <Button type="submit">{labels.view}</Button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={calendarHref}>{labels.backToCalendar}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">{labels.backToDashboard}</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
