import { describe, expect, it } from "vitest";
import {
  assertDemoSeedAllowed,
  isLocalDatabaseUrl,
  isDemoSeedCategory,
} from "./demo-seed-guard";

describe("demo-seed-guard", () => {
  it("accepts localhost DATABASE_URL", () => {
    expect(
      isLocalDatabaseUrl(
        "postgresql://timeblock:pass@localhost:5432/timeblock_db?schema=app",
      ),
    ).toBe(true);
  });

  it("rejects remote DATABASE_URL without DEMO_SEED=1", () => {
    const result = assertDemoSeedAllowed({
      databaseUrl:
        "postgresql://user:pass@ep-remote.neon.tech/neondb?schema=app",
      demoSeedFlag: undefined,
    });
    expect(result.ok).toBe(false);
  });

  it("allows remote DATABASE_URL when DEMO_SEED=1", () => {
    const result = assertDemoSeedAllowed({
      databaseUrl:
        "postgresql://user:pass@ep-remote.neon.tech/neondb?schema=app",
      demoSeedFlag: "1",
    });
    expect(result.ok).toBe(true);
  });

  it("detects demo marker in category description", () => {
    expect(isDemoSeedCategory("[Demo] 本地演示分类")).toBe(true);
    expect(isDemoSeedCategory("Personal")).toBe(false);
  });
});
