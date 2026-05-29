import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNav } from "./app-nav";
import { getDictionary } from "@/lib/i18n";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/components/language-switcher", () => ({
  LanguageSwitcher: () => <div data-testid="lang-switcher" />,
}));

describe("AppNav", () => {
  it("renders app name and main navigation links in Chinese", () => {
    const dict = getDictionary("zh");
    const signOutAction = async () => {};
    render(
      <AppNav locale="zh" dict={dict} user={null} signOutAction={signOutAction} />,
    );

    expect(screen.getByText(dict.app.brand)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: dict.nav.home })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: dict.nav.categories }),
    ).toHaveAttribute("href", "/categories");
    expect(
      screen.getByRole("link", { name: dict.nav.timeBlocks }),
    ).toHaveAttribute("href", "/time-blocks");
    expect(
      screen.getByRole("link", { name: dict.nav.calendar }),
    ).toHaveAttribute("href", "/calendar");
    expect(
      screen.getByRole("link", { name: dict.nav.dashboard }),
    ).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: dict.nav.focus })).toHaveAttribute(
      "href",
      "/focus",
    );
    expect(screen.getByRole("link", { name: dict.nav.review })).toHaveAttribute(
      "href",
      "/review/day",
    );
    expect(screen.getByRole("link", { name: dict.nav.signIn })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
