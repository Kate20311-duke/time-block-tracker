import { describe, expect, it, vi, beforeEach } from "vitest";
import { ensureDbUser } from "./ensure-db-user";

const { findUniqueMock, createMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
      create: createMock,
    },
  },
}));

describe("ensureDbUser", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    createMock.mockReset();
  });

  it("returns existing user by session id", async () => {
    findUniqueMock.mockResolvedValueOnce({ id: "user-1" });

    const result = await ensureDbUser({
      id: "user-1",
      email: "a@example.com",
    });

    expect(result.id).toBe("user-1");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("falls back to email when session id is missing in DB", async () => {
    findUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "db-user" });

    const result = await ensureDbUser({
      id: "stale-jwt-id",
      email: "a@example.com",
    });

    expect(result.id).toBe("db-user");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates user when neither id nor email exists in DB", async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "new-user" });

    const result = await ensureDbUser({
      id: "new-user",
      email: "new@example.com",
      name: "Test",
    });

    expect(result.id).toBe("new-user");
    expect(createMock).toHaveBeenCalledWith({
      data: {
        id: "new-user",
        email: "new@example.com",
        name: "Test",
        image: null,
      },
      select: { id: true },
    });
  });
});
