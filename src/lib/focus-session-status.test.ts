import { describe, expect, it } from "vitest";
import {
  blocksCategoryDeletionFocusStatus,
  isFocusSessionAbandoned,
  isFocusSessionActive,
  isFocusSessionFailed,
  isFocusSessionPaused,
  isFocusSessionRunning,
} from "./focus-session-status";

describe("focus-session-status", () => {
  it("identifies running sessions", () => {
    expect(isFocusSessionRunning("running")).toBe(true);
    expect(isFocusSessionRunning("abandoned")).toBe(false);
  });

  it("identifies paused and active sessions", () => {
    expect(isFocusSessionPaused("paused")).toBe(true);
    expect(isFocusSessionActive("running")).toBe(true);
    expect(isFocusSessionActive("paused")).toBe(true);
    expect(isFocusSessionActive("completed")).toBe(false);
  });

  it("treats abandoned as non-blocking for category delete", () => {
    expect(isFocusSessionAbandoned("abandoned")).toBe(true);
    expect(blocksCategoryDeletionFocusStatus("abandoned")).toBe(false);
    expect(blocksCategoryDeletionFocusStatus("running")).toBe(true);
    expect(blocksCategoryDeletionFocusStatus("completed")).toBe(true);
    expect(blocksCategoryDeletionFocusStatus("converted")).toBe(true);
    expect(blocksCategoryDeletionFocusStatus("failed")).toBe(true);
    expect(isFocusSessionFailed("failed")).toBe(true);
    expect(isFocusSessionActive("failed")).toBe(false);
  });
});
