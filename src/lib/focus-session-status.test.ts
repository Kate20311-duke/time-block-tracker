import { describe, expect, it } from "vitest";
import {
  isFocusSessionAbandoned,
  isFocusSessionActive,
  isFocusSessionFailed,
  isFocusSessionPaused,
  isFocusSessionPlanned,
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

  it("identifies planned, failed, and abandoned without treating them as category-delete blockers", () => {
    expect(isFocusSessionPlanned("planned")).toBe(true);
    expect(isFocusSessionAbandoned("abandoned")).toBe(true);
    expect(isFocusSessionFailed("failed")).toBe(true);
    expect(isFocusSessionActive("failed")).toBe(false);
    expect(isFocusSessionActive("abandoned")).toBe(false);
  });
});
