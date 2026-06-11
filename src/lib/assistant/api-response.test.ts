import { describe, expect, it } from "vitest";

import {
  assistantErrorResponse,
  assistantJsonResponse,
} from "@/lib/assistant/api-response";

describe("assistant api responses", () => {
  it("returns unified error shape", async () => {
    const response = assistantErrorResponse({
      status: 429,
      error: "RATE_LIMITED",
      message: "请求过于频繁，请稍后再试。",
      resetAt: 1_700_000_000_000,
    });

    expect(response.status).toBe(429);
    const body = (await response.json()) as {
      error: string;
      message: string;
      resetAt: number;
    };
    expect(body).toEqual({
      error: "RATE_LIMITED",
      message: "请求过于频繁，请稍后再试。",
      resetAt: 1_700_000_000_000,
    });
  });

  it("returns json data for success responses", async () => {
    const response = assistantJsonResponse({ ok: true });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
