import inquirer from "inquirer";
import { TypedConfigStore } from "./config-store.ts";
import { packageJson } from "./package-json.ts";
import { logger } from "./logger.ts";

export type Config = {
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  provider: Provider;
  model: string;
  max_tokens: string;
  max_context_length: string;
};

export enum ProvidersEnum {
  openai = "openai",
  anthropic = "anthropic",
  openrouter = "openrouter",
}

export type Provider = `${ProvidersEnum}`;
type API_KEY_KEY = "OPENAI_API_KEY" | "ANTHROPIC_API_KEY" | "OPENROUTER_API_KEY";

export const configDefaults = {
  provider: "anthropic",
  model: "claude-3-5-sonnet-20240620",
  max_tokens: 8000,
  max_context_length: 150_000,
};

const configStore = new TypedConfigStore(packageJson.name, configDefaults);

const getUppercaseApiKey = (provider: Provider): API_KEY_KEY =>
  `${provider.toUpperCase()}_API_KEY` as API_KEY_KEY;

export const config = {
  getApiKey(provider: Provider): string | undefined {
    const uppercaseApiKey = getUppercaseApiKey(provider);
    const configKey = configStore.get(uppercaseApiKey) as string | undefined;
    const envKey = process.env[uppercaseApiKey];

    if (configKey) return configKey;
    if (envKey) return envKey;

    return undefined;
  },

  async getApiKeyOrAsk(provider: Provider): Promise<string> {
    const key = this.getApiKey(provider);
    if (key) return key;

    const response = await inquirer.prompt<{ apiKey: string }>([
      {
        type: "password",
        name: "apiKey",
        message: `Enter your ${provider} API key (or set it as system variable and restart the terminal):`,
      },
    ]);

    this.setApiKey(provider, response.apiKey);
    return response.apiKey;
  },

  setApiKey(provider: Provider, key: string): void {
    configStore.set(getUppercaseApiKey(provider), key);
  },

  /**
   * A default provider is set in the config file, so this will always return a provider.
   */
  getActiveProvider(): Provider {
    return (
      (configStore.get("provider") as Provider) || (configDefaults.provider as Provider)
    );
  },

  setActiveProvider(provider: Provider): void {
    configStore.set("provider", provider);
  },

  /**
   * This also defines default models for each provider. So no matter what provider is active,
   * this will always return a model, even if none is specified in config.
   */
  getModel(): string {
    const model = configStore.get("model") as string | undefined;
    if (model) {
      return model;
    }

    const provider = this.getActiveProvider();
    switch (provider) {
      case "openai":
        return "gpt-4o";
      case "anthropic":
        return "claude-3-5-sonnet-20240620";
      case "openrouter":
        return "anthropic/claude-3.5-sonnet:beta";
      default:
        throw new Error(`Invalid provider: ${provider}`);
    }
  },

  setModel(model: string): void {
    configStore.set("model", model);
  },

  getMaxTokens(): number {
    const maxTokens = configStore.get("max_tokens");
    const asNumber = parseInt(maxTokens);
    if (isNaN(asNumber) || asNumber < 0) {
      logger.error(`Invalid max tokens: ${maxTokens}`);
      this.setMaxTokens(configDefaults.max_tokens);
      return configDefaults.max_tokens;
    }

    return asNumber;
  },

  setMaxTokens(maxTokens: number): void {
    configStore.set("max_tokens", String(maxTokens));
  },

  getMaxContextLength(): number {
    const maxContextLength = configStore.get("max_context_length");
    const asNumber = parseInt(maxContextLength);
    if (isNaN(asNumber) || asNumber < 0) {
      logger.error(`Invalid max context length: ${maxContextLength}`);
      this.setMaxContextLength(configDefaults.max_context_length);
      return configDefaults.max_context_length;
    }

    return asNumber;
  },

  setMaxContextLength(maxContextLength: number): void {
    configStore.set("max_context_length", String(maxContextLength));
  },

  clearConfig(): void {
    configStore.clear();
  },

  getAll(): Config {
    return configStore.all;
  },
};