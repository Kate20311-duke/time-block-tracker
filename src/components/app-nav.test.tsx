import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppLayoutController } from "./app-layout-controller";
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

describe("AppLayoutController", () => {
  it("renders public header with brand and sign-in on home", () => {
    const dict = getDictionary("zh");
    const signOutAction = async () => {};
    render(
      <AppLayoutController
        locale="zh"
        dict={dict}
        user={null}
        signOutAction={signOutAction}
        activeFocusSession={null}
      >
        <div>content</div>
      </AppLayoutController>,
    );

    expect(screen.getByText(dict.app.brand)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: dict.nav.signIn })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
