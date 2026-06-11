import Link from "next/link";

import { RoutineFormFields } from "@/components/routines/routine-form-fields";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CategoryOption } from "@/lib/routines/routine-types";
import type { Locale } from "@/lib/i18n/types";

type Props = {
  formKey: string;
  locale: Locale;
  categories: CategoryOption[];
  action: (formData: FormData) => Promise<void>;
  labels: {
    heading: string;
    submit: string;
    submitting: string;
    title: string;
    titlePlaceholder: string;
    category: string;
    categoryHint: string;
    selectCategory: string;
    noCategoriesHint: string;
    goCreateCategory: string;
    startTime: string;
    endTime: string;
    repeatDays: string;
    weekdays: string;
    everyday: string;
    clear: string;
    startDate: string;
    endDate: string;
    notes: string;
    notesPlaceholder: string;
  };
  defaultStartDate: string;
};

export function RoutineFormCard({
  formKey,
  locale,
  categories,
  action,
  labels,
  defaultStartDate,
}: Props) {
  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{labels.heading}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{labels.noCategoriesHint}</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/categories">{labels.goCreateCategory}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{labels.heading}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          key={formKey}
          action={action}
          className="grid gap-4 sm:grid-cols-2"
        >
          <RoutineFormFields
            locale={locale}
            categories={categories}
            defaults={{
              startTime: "09:00",
              endTime: "10:00",
              daysOfWeek: [1, 2, 3, 4, 5],
              startDate: defaultStartDate,
            }}
            labels={labels}
          />
          <div className="sm:col-span-2">
            <SubmitButton label={labels.submit} pendingLabel={labels.submitting} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
