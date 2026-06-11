import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/assistant/tomorrow-plan-apply", () => ({
  applyTomorrowPlanBlocks: vi.fn(),
}));
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(),
  ensureDbUser: vi.fn(),
}));
vi.mock("@/lib/user-calendar-timezone.server", () => ({
  getUserCalendarTimeZone: vi.fn(),
}));
vi.mock("@/lib/assistant/assistant-route", () => ({
  enforceAssistantRateLimit: vi.fn(() => null),
}));

import { applyTomorrowPlanBlocks } from "@/lib/assistant/tomorrow-plan-apply";
import { ensureDbUser, getSessionUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";
import { POST } from "./route";

const mockUser = { id: "user_test", email: "test@example.com", name: "Test" };

describe("POST /api/assistant/tomorrow-plan/apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session user is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/assistant/tomorrow-plan/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: [{ title: "x", categoryId: "c", startTime: "a", endTime: "b" }] }),
      }),
    );

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 400 when blocks is empty", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(mockUser as never);
    vi.mocked(ensureDbUser).mockResolvedValue({ id: "user_test" } as never);

    const response = await POST(
      new Request("http://localhost/api/assistant/tomorrow-plan/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: [] }),
      }),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("INVALID_INPUT");
  });

  it("returns 400 when blocks exceed max count", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(mockUser as never);
    vi.mocked(ensureDbUser).mockResolvedValue({ id: "user_test" } as never);

    const blocks = Array.from({ length: 11 }, (_, index) => ({
      title: `Block ${index}`,
      categoryId: "cat_1",
      startTime: "2026-06-11T01:00:00.000Z",
      endTime: "2026-06-11T02:00:00.000Z",
    }));

    const response = await POST(
      new Request("http://localhost/api/assistant/tomorrow-plan/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
      }),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("INVALID_INPUT");
  });

  it("returns 400 for invalid JSON body", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(mockUser as never);

    const response = await POST(
      new Request("http://localhost/api/assistant/tomorrow-plan/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 200 with apply result on success", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(mockUser as never);
    vi.mocked(ensureDbUser).mockResolvedValue({ id: "user_test" } as never);
    vi.mocked(getUserCalendarTimeZone).mockResolvedValue("Asia/Shanghai");
    vi.mocked(applyTomorrowPlanBlocks).mockResolvedValue({
      createdCount: 1,
      skippedCount: 0,
      createdBlocks: [],
      skippedBlocks: [],
      calendarUrl: "/calendar?date=2026-06-11",
    });

    const response = await POST(
      new Request("http://localhost/api/assistant/tomorrow-plan/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: [
            {
              title: "Focus",
              categoryId: "cat_1",
              startTime: "2026-06-11T01:00:00.000Z",
              endTime: "2026-06-11T02:00:00.000Z",
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as { createdCount: number };
    expect(json.createdCount).toBe(1);
    expect(applyTomorrowPlanBlocks).toHaveBeenCalledWith({
      userId: "user_test",
      timeZone: "Asia/Shanghai",
      blocks: expect.any(Array),
    });
  });
});
