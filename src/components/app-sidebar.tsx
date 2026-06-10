"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock } from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  APP_NAV_ITEMS,
  isNavItemActive,
} from "@/lib/app-nav-config";
import type { Dictionary, Locale } from "@/lib/i18n/types";

type ShellUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type Props = {
  locale: Locale;
  dict: Dictionary;
  user: ShellUser;
  signOutAction: () => Promise<void>;
};

function userInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 1).toUpperCase();
}

export function AppSidebar({ locale, dict, user, signOutAction }: Props) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Clock className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">{dict.app.brand}</span>
                    <span className="text-xs text-muted-foreground">
                      {dict.app.tagline}
                    </span>
                  </div>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{dict.shell.navGroup}</SidebarGroupLabel>
          <SidebarMenu>
            {APP_NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(pathname, item);
              const href =
                item.href === "/review" ? "/review/day" : item.href;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={dict.nav[item.labelKey]}
                    render={
                      <Link href={href}>
                        <item.icon />
                        <span>{dict.nav[item.labelKey]}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="w-full min-w-0 px-2 py-1.5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1">
              <LanguageSwitcher
                variant="sidebar"
                locale={locale}
                labels={{
                  aria: dict.lang.switcherAria,
                  zh: dict.lang.zh,
                  en: dict.lang.en,
                }}
              />
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <Avatar className="size-8 rounded-lg">
                {user.image ? (
                  <AvatarImage src={user.image} alt={user.name ?? dict.shell.userAvatarAlt} />
                ) : null}
                <AvatarFallback className="rounded-lg">
                  {userInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-none">
                <span className="truncate font-medium">
                  {user.name ?? dict.shell.anonymousUser}
                </span>
                {user.email ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                ) : null}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={signOutAction} className="w-full">
              <SidebarMenuButton type="submit" className="w-full">
                <span>{dict.nav.signOut}</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
