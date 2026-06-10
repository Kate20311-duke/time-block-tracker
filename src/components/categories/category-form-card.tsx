import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Dictionary } from "@/lib/i18n/types";

type Props = {
  formKey: string;
  action: (formData: FormData) => Promise<void>;
  labels: Pick<
    Dictionary["categories"],
    | "newCategory"
    | "name"
    | "namePlaceholder"
    | "color"
    | "descriptionOptional"
    | "descriptionPlaceholder"
  > &
    Pick<Dictionary["common"], "create" | "submitting">;
};

export function CategoryFormCard({ formKey, action, labels }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{labels.newCategory}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          key={formKey}
          action={action}
          className="grid gap-4 sm:grid-cols-2"
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{labels.name}</span>
            <Input
              name="name"
              required
              placeholder={labels.namePlaceholder}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{labels.color}</span>
            <Input
              name="color"
              type="color"
              defaultValue="#3b82f6"
              className="h-9 w-16 cursor-pointer p-1"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">{labels.descriptionOptional}</span>
            <Textarea
              name="description"
              rows={2}
              placeholder={labels.descriptionPlaceholder}
            />
          </label>
          <div className="sm:col-span-2">
            <SubmitButton
              label={labels.create}
              pendingLabel={labels.submitting}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
