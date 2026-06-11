import "server-only";

import OpenAI from "openai";

import { getDeepSeekConfig } from "@/lib/assistant/deepseek-config";

export { getDeepSeekConfig } from "@/lib/assistant/deepseek-config";
export type { DeepSeekConfig } from "@/lib/assistant/deepseek-config";

export function hasDeepSeekApiKey(): boolean {
  return getDeepSeekConfig().configured;
}

export function createDeepSeekClient(): OpenAI {
  const { apiKey, baseURL, configured } = getDeepSeekConfig();
  if (!configured || !apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  return new OpenAI({
    apiKey,
    baseURL,
  });
}
