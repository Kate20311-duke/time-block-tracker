import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { TimezoneInitializer } from "@/components/timezone-initializer";
import { signOutAction } from "@/lib/actions/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
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

  return (
    <html
      lang={locale === "zh" ? "zh-CN" : "en"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        <TimezoneInitializer />
        <AppNav
          locale={locale}
          dict={dict}
          user={session?.user ?? null}
          signOutAction={signOutAction}
        />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
