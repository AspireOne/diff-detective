import inquirer from "inquirer";
import { configStore as config } from "./config-store.ts";

export type Provider = "openai" | "anthropic" | "openrouter";
type API_KEY_KEY = "OPENAI_API_KEY" | "ANTHROPIC_API_KEY" | "OPENROUTER_API_KEY";

function getUppercaseApiKey(provider: Provider): API_KEY_KEY {
  return `${provider.toUpperCase()}_API_KEY` as API_KEY_KEY;
}

export async function getApiKey(provider: Provider): Promise<string> {
  const uppercaseApiKey = getUppercaseApiKey(provider);
  const configKey = config.get(uppercaseApiKey) as string | undefined;
  const envKey = process.env[uppercaseApiKey];

  if (configKey) return configKey;
  if (envKey) return envKey;

  const response = await inquirer.prompt<{ apiKey: string }>([
    {
      type: "password",
      name: "apiKey",
      message: `Enter your ${provider} API key (or set it as system variable and restart the terminal):`,
    },
  ]);

  setApiKey(provider, response.apiKey);
  return response.apiKey;
}

export function setApiKey(provider: Provider, key: string): void {
  config.set(getUppercaseApiKey(provider), key);
}

export function getActiveProvider(): Provider {
  return config.get("provider") as Provider;
}

export function setActiveProvider(provider: Provider): void {
  config.set("provider", provider);
}

export function getModel(): string | undefined {
  const model = config.get("model") as string | undefined;
  if (model) {
    return model;
  }

  const provider = getActiveProvider();
  switch (provider) {
    case "openai":
      return "gpt-4o";
    case "anthropic":
      return "claude-3-5-sonnet-20240620";
    case "openrouter":
      return "anthropic/claude-3.5-sonnet:beta";
    default:
      return undefined;
  }
}

export function setModel(model: string): void {
  config.set("model", model);
}

export function clearConfig(): void {
  config.clear();
}
