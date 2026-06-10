import Link from "next/link";
import {
  BarChart3,
  Blocks,
  Calendar,
  Timer,
} from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

const FEATURE_ICONS = [Blocks, Calendar, Timer, BarChart3] as const;

export async function LandingPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const l = t.landing;

  const features = [
    l.features.plan,
    l.features.category,
    l.features.stopwatch,
    l.features.review,
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 py-4 md:py-8">
      <section className="flex flex-col gap-6">
        <div className="inline-flex w-fit items-center rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          {t.app.tagline}
        </div>
        <div className="space-y-4">
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {l.heroTitle}
          </h1>
          <p className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            {l.heroSubtitle}
          </p>
        </div>
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {l.highlights.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" asChild>
            <Link href="/login">{l.ctaSignIn}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">{l.ctaGetStarted}</Link>
          </Button>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{l.localDemoHint}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">{l.featuresTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature, index) => {
            const Icon = FEATURE_ICONS[index]!;
            return (
              <Card key={feature.title} className="h-full">
                <CardHeader>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription className="text-pretty leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border bg-muted/30 px-6 py-8 text-center">
        <h2 className="text-lg font-semibold">{l.footerCtaTitle}</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          {l.footerCtaDescription}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/login">{l.ctaSignIn}</Link>
          </Button>
          <LanguageSwitcher
            locale={locale}
            labels={{
              aria: t.lang.switcherAria,
              zh: t.lang.zh,
              en: t.lang.en,
            }}
          />
        </div>
      </section>
    </div>
  );
}
