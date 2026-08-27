import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, findFirstMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findFirstMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    focusSession: {
      findMany: findManyMock,
      findFirst: findFirstMock,
    },
  },
}));

import { ScopedAccessError } from "./scoped-errors";
import {
  activeFocusSessionForUser,
  assertFocusSessionOwned,
  focusSessionsForUser,
  runningFocusSessionForUser,
} from "./scoped";

const USER_A = "user_a";
const USER_B = "user_b";
const SESSION_A = {
  id: "focus_a",
  userId: USER_A,
  categoryId: "cat_a",
  status: "running",
};

describe("FocusSession userId ownership", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    findFirstMock.mockReset();
  });

  it("lists sessions with userId scope, not category.userId", async () => {
    findManyMock.mockResolvedValueOnce([SESSION_A]);

    await focusSessionsForUser(USER_A);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_A },
      }),
    );
    const where = findManyMock.mock.calls[0][0].where as Record<string, unknown>;
    expect(where).not.toHaveProperty("category");
  });

  it("lets the owner read their session", async () => {
    findFirstMock.mockResolvedValueOnce(SESSION_A);

    const session = await assertFocusSessionOwned(USER_A, SESSION_A.id);

    expect(session.id).toBe(SESSION_A.id);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: SESSION_A.id, userId: USER_A },
    });
  });

  it("rejects another user's session id", async () => {
    findFirstMock.mockResolvedValueOnce(null);

    await expect(
      assertFocusSessionOwned(USER_A, "focus_owned_by_b"),
    ).rejects.toBeInstanceOf(ScopedAccessError);

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "focus_owned_by_b", userId: USER_A },
    });
  });

  it("finds the active session for the requested user only", async () => {
    findManyMock.mockResolvedValueOnce([SESSION_A]);

    const active = await activeFocusSessionForUser(USER_A);

    expect(active?.id).toBe(SESSION_A.id);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ userId: USER_A }, { status: { in: ["running", "paused"] } }],
        },
        take: 1,
      }),
    );
  });

  it("does not return another user's running session as active", async () => {
    findManyMock.mockResolvedValueOnce([]);

    const active = await activeFocusSessionForUser(USER_B);

    expect(active).toBeNull();
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ userId: USER_B }, { status: { in: ["running", "paused"] } }],
        },
      }),
    );
  });

  it("finds running sessions by userId", async () => {
    findManyMock.mockResolvedValueOnce([SESSION_A]);

    await runningFocusSessionForUser(USER_A);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ userId: USER_A }, { status: "running" }],
        },
        take: 1,
      }),
    );
  });
});

describe("FocusSession null category ownership", () => {
  const ORPHAN = {
    id: "focus_orphan",
    userId: USER_A,
    categoryId: null,
    status: "running",
  };

  it("still scopes a null-category session by userId", async () => {
    findFirstMock.mockResolvedValueOnce(ORPHAN);

    const session = await assertFocusSessionOwned(USER_A, ORPHAN.id);

    expect(session.categoryId).toBeNull();
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: ORPHAN.id, userId: USER_A },
    });
  });

  it("still finds a running null-category session as active", async () => {
    findManyMock.mockResolvedValueOnce([ORPHAN]);

    const active = await activeFocusSessionForUser(USER_A);

    expect(active?.id).toBe(ORPHAN.id);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ userId: USER_A }, { status: { in: ["running", "paused"] } }],
        },
        take: 1,
      }),
    );
  });

  it("keeps active uniqueness for a running null-category session", async () => {
    findManyMock.mockResolvedValueOnce([ORPHAN]);

    const running = await runningFocusSessionForUser(USER_A);

    expect(running?.id).toBe(ORPHAN.id);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ userId: USER_A }, { status: "running" }],
        },
        take: 1,
      }),
    );
  });
});
