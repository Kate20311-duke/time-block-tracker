import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from "@/auth";
import { AppLayoutController } from "@/components/app-layout-controller";
import type { GlobalActiveFocusSession } from "@/components/global-focus-timer-indicator";
import { Providers } from "@/components/providers";
import { TimezoneInitializer } from "@/components/timezone-initializer";
import { signOutAction } from "@/lib/actions/auth";
import { activeFocusSessionForUser, categoriesForUser } from "@/lib/db/scoped";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/session";
import { PWA_SHORT_NAME, PWA_THEME_COLOR } from "@/lib/pwa";
import { THEME_INIT_SCRIPT } from "@/lib/theme-init-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: dict.app.brand,
    description: dict.app.metaDescription,
    applicationName: PWA_SHORT_NAME,
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: PWA_THEME_COLOR },
      { media: "(prefers-color-scheme: dark)", color: PWA_THEME_COLOR },
    ],
    appleWebApp: {
      capable: true,
      title: PWA_SHORT_NAME,
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-title": PWA_SHORT_NAME,
      "msapplication-TileColor": PWA_THEME_COLOR,
      "msapplication-navbutton-color": PWA_THEME_COLOR,
    },
    formatDetection: {
      telephone: false,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const session = await auth();
  const sessionUser = await getSessionUser();

  let activeFocusSession: GlobalActiveFocusSession | null = null;
  if (sessionUser) {
    const active = await activeFocusSessionForUser(sessionUser.id);
    if (active) {
      const categories = await categoriesForUser(sessionUser.id, {
        where: { id: active.categoryId },
        select: { name: true, color: true },
        take: 1,
      });
      const category = categories[0];
      if (category) {
        activeFocusSession = {
          id: active.id,
          mode: active.mode as "stopwatch" | "pomodoro",
          status: active.status,
          startTimeIso: active.startTime.toISOString(),
          pausedAtIso: active.pausedAt?.toISOString() ?? null,
          pausedTotalSeconds: active.pausedTotalSeconds,
          title: active.title,
          plannedDurationMinutes: active.plannedDurationMinutes,
          category: {
            name: category.name,
            color: category.color,
          },
        };
      }
    }
  }

  return (
    <html
      lang={locale === "zh" ? "zh-CN" : "en"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>
          <TimezoneInitializer />
          <AppLayoutController
          locale={locale}
          dict={dict}
          user={session?.user ?? null}
          signOutAction={signOutAction}
          activeFocusSession={activeFocusSession}
        >
          {children}
        </AppLayoutController>
        </Providers>
      </body>
    </html>
  );
}
