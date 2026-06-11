const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";

export type DeepSeekConfig = {
  apiKey: string | null;
  baseURL: string;
  model: string;
  configured: boolean;
};

export function getDeepSeekConfig(): DeepSeekConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim() || null;
  return {
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_BASE_URL,
    model: process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL,
    configured: Boolean(apiKey),
  };
}
