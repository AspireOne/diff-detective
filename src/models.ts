import { Provider, ProvidersEnum } from "./config.ts";

const openai = [
  "gpt-4o",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-05-13",
  "chatgpt-4o-latest",
  "gpt-4o-mini",
  "gpt-4o-mini-2024-07-18",
  "o1-mini",
  "o1-preview",
  "o1-preview-2024-09-12",
  "o1-mini-2024-09-12",
  "gpt-4-turbo",
  "gpt-4-turbo-2024-04-09",
  "gpt-4-turbo-preview",
  "gpt-4-0125-preview",
  "gpt-4-1106-preview",
  "gpt-4",
  "gpt-4-0613",
  "gpt-4-0314",
  "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-1106",
];

const anthropic = [
  "claude-3-5-sonnet-20240620",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
];

const openrouter = [
  "anthropic/claude-3.5-sonnet:beta",
  "openai/gpt-4o-2024-08-06",
  "deepseek/deepseek-chat",
  // many more...
];

export const models: Record<Provider, string[]> = {
  openai,
  anthropic,
  openrouter,
};
