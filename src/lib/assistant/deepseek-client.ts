import "server-only";

import OpenAI from "openai";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";

export type DeepSeekConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
};

export function getDeepSeekConfig(): DeepSeekConfig {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY?.trim() ?? "",
    baseURL: process.env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_BASE_URL,
    model: process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL,
  };
}

export function hasDeepSeekApiKey(): boolean {
  return Boolean(getDeepSeekConfig().apiKey);
}

export function createDeepSeekClient(): OpenAI {
  const { apiKey, baseURL } = getDeepSeekConfig();
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  return new OpenAI({
    apiKey,
    baseURL,
  });
}
