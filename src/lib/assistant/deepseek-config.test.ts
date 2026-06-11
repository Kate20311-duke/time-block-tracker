import { afterEach, describe, expect, it } from "vitest";

import { getDeepSeekConfig } from "@/lib/assistant/deepseek-config";

const ORIGINAL_ENV = { ...process.env };

describe("getDeepSeekConfig", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns configured false when API key is missing", () => {
    delete process.env.DEEPSEEK_API_KEY;
    const config = getDeepSeekConfig();
    expect(config.configured).toBe(false);
    expect(config.apiKey).toBeNull();
  });

  it("returns configured true when API key is present", () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    const config = getDeepSeekConfig();
    expect(config.configured).toBe(true);
    expect(config.apiKey).toBe("test-key");
  });

  it("uses default baseURL and model", () => {
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_BASE_URL;
    delete process.env.DEEPSEEK_MODEL;

    const config = getDeepSeekConfig();
    expect(config.baseURL).toBe("https://api.deepseek.com");
    expect(config.model).toBe("deepseek-v4-flash");
  });
});
