import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkAssistantRateLimit,
  resetAssistantRateLimitStore,
} from "@/lib/assistant/rate-limit";

describe("checkAssistantRateLimit", () => {
  afterEach(() => {
    resetAssistantRateLimitStore();
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const first = checkAssistantRateLimit({
      key: "user:time-review",
      limit: 3,
      windowMs: 60_000,
    });
    const second = checkAssistantRateLimit({
      key: "user:time-review",
      limit: 3,
      windowMs: 60_000,
    });

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);
  });

  it("blocks requests over the limit", () => {
    for (let i = 0; i < 3; i++) {
      checkAssistantRateLimit({
        key: "user:tomorrow-plan",
        limit: 3,
        windowMs: 60_000,
      });
    }

    const blocked = checkAssistantRateLimit({
      key: "user:tomorrow-plan",
      limit: 3,
      windowMs: 60_000,
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetAt).toBeGreaterThan(Date.now());
  });

  it("resets after the window expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T10:00:00Z"));

    for (let i = 0; i < 2; i++) {
      checkAssistantRateLimit({
        key: "user:apply",
        limit: 2,
        windowMs: 10_000,
      });
    }

    const blocked = checkAssistantRateLimit({
      key: "user:apply",
      limit: 2,
      windowMs: 10_000,
    });
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(10_001);

    const allowedAgain = checkAssistantRateLimit({
      key: "user:apply",
      limit: 2,
      windowMs: 10_000,
    });
    expect(allowedAgain.allowed).toBe(true);
    expect(allowedAgain.remaining).toBe(1);
  });
});
