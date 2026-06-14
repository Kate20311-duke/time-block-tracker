"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GoalTemplateDefinition, GoalTemplateGroup, GoalTemplateId } from "@/lib/goal-templates";
import { groupGoalTemplates } from "@/lib/goal-templates";

export type ResolvedGoalTemplate = GoalTemplateDefinition & {
  title: string;
  description: string;
  targetLabel: string;
  metricLabel: string;
  periodLabel: string;
};

type Props = {
  templates: ResolvedGoalTemplate[];
  selectedTemplateId: GoalTemplateId | null;
  onSelect: (templateId: GoalTemplateId) => void;
  labels: {
    sectionTitle: string;
    sectionDescription: string;
    useTemplate: string;
    selectedFeedback: string;
    groups: Record<GoalTemplateGroup, string>;
  };
};

export function GoalTemplatesPicker({
  templates,
  selectedTemplateId,
  onSelect,
  labels,
}: Props) {
  const byId = new Map(templates.map((template) => [template.id, template]));
  const grouped = groupGoalTemplates(templates).map((entry) => ({
    ...entry,
    templates: entry.templates
      .map((template) => byId.get(template.id))
      .filter((template): template is ResolvedGoalTemplate => template != null),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{labels.sectionTitle}</CardTitle>
        <CardDescription>{labels.sectionDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {selectedTemplateId ? (
          <p className="text-sm text-muted-foreground">
            {labels.selectedFeedback.replace(
              "{title}",
              byId.get(selectedTemplateId)?.title ?? "",
            )}
          </p>
        ) : null}
        {grouped.map(({ group, templates: groupTemplates }) =>
          groupTemplates.length === 0 ? null : (
            <div key={group} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{labels.groups[group]}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {groupTemplates.map((template) => {
                  const isSelected = selectedTemplateId === template.id;
                  return (
                    <Button
                      key={template.id}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      className="h-auto flex-col items-start gap-2 px-3 py-3 text-left"
                      onClick={() => onSelect(template.id)}
                    >
                      <span className="font-medium">{template.title}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {template.description}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {template.metricLabel}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {template.periodLabel}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {template.targetLabel}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {labels.useTemplate}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ),
        )}
      </CardContent>
    </Card>
  );
}
