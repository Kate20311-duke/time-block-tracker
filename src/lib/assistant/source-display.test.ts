import { afterEach, describe, expect, it, vi } from "vitest";

import { getAssistantSourceNoticeKind } from "@/lib/assistant/source-display";

describe("getAssistantSourceNoticeKind", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hides deepseek notice in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getAssistantSourceNoticeKind("deepseek")).toBe("none");
  });

  it("shows dev deepseek notice in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getAssistantSourceNoticeKind("deepseek")).toBe("dev-deepseek");
  });

  it("shows production notice for fallback in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getAssistantSourceNoticeKind("fallback")).toBe("production");
  });

  it("shows dev mock notice in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getAssistantSourceNoticeKind("mock")).toBe("dev-mock");
  });
});
