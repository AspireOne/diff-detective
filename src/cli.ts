import { Command, Option } from "commander";
import { review } from "./review";
import { config } from "./config";
import type { Provider } from "./config";
import { packageJson } from "./package-json";
import { logger } from "./logger";
import { ProvidersEnum } from "./config.ts";

export type ReviewCliOptions = {
  model?: string;
  provider?: Provider;
  maxTokens?: number;
  maxContextLength?: number;
  apiKey?: string;
};

const reviewKey = (key: keyof ReviewCliOptions) => key;

export function cli() {
  const program = new Command();

  program
    .name(packageJson.name)
    .description(packageJson.description)
    .version(packageJson.version);

  program
    .command("review")
    .description("Review staged changes")
    .option(
      `-m, --model <${reviewKey("model")}>`,
      `Specify the model to use for this review (the active provider must support it) (gpt-4o, claude-3-5-sonnet-20240620, anthropic/claude-3.5-sonnet:beta, etc. ...) (using: ${config.getModel()})`,
    )
    .addOption(
      new Option(
        `-p, --provider <${reviewKey("provider")}>`,
        `Specify the provider to use for this review (using: ${config.getActiveProvider()})`,
      ).choices(Object.values(ProvidersEnum)),
    )
    .option(
      `-mt, --max-tokens <${reviewKey("maxTokens")}>`,
      `Specify the max tokens to use for this review (using: ${String(config.getMaxTokens())})`,
    )
    .option(
      `-a, --api-key <${reviewKey("apiKey")}>`,
      `Specify the API key to use for this review (using: ${config.getApiKey(config.getActiveProvider())?.substring(0, 10) ?? "none"})`,
    )
    .option(
      `-mcl, --max-context-length <${reviewKey("maxContextLength")}>`,
      `Specify the max context length to use for this review (using: ${String(config.getMaxContextLength())})`,
    )
    .action((options) => review(options as Partial<ReviewCliOptions>));

  program
    .command("set-api-key <provider> <key>")
    .description("Set the API key for a specific provider")
    .action((provider: string, key: string) => {
      if (["openai", "anthropic", "openrouter"].includes(provider)) {
        config.setApiKey(provider as Provider, key);
        logger.success(`API key for ${provider} has been set successfully.`);
      } else {
        logger.error("Invalid provider. Use 'openai', 'anthropic', or 'openrouter'.");
      }
    });

  program
    .command("set-provider <provider>")
    .description("Set the active AI provider")
    .action((provider: string) => {
      if (["openai", "anthropic", "openrouter"].includes(provider)) {
        config.setActiveProvider(provider as Provider);
        logger.success(`Active provider set to ${provider}.`);
      } else {
        logger.error("Invalid provider. Use 'openai', 'anthropic', or 'openrouter'.");
      }
    });

  program
    .command("set-model <model>")
    .description("Set the default model to use")
    .action((model: string) => {
      config.setModel(model);
      logger.success(`Default model set to ${model}.`);
    });

  program
    .command("set-max-tokens <value>")
    .description(
      "Set the max tokens the AI can use. Any remaining changes will be cut off smartly.",
    )
    .action((value: string) => {
      const maxTokens = parseInt(value, 10);
      if (isNaN(maxTokens) || maxTokens <= 0) {
        logger.error("Invalid max tokens value. Please provide a positive integer.");
      } else {
        config.setMaxTokens(maxTokens);
        logger.success(`Max tokens set to ${maxTokens}.`);
      }
    });

  program
    .command("set-max-context-length <value>")
    .description(
      "Set the max context length for the AI. This limits the total input size.",
    )
    .action((value: string) => {
      const maxContextLength = parseInt(value, 10);
      if (isNaN(maxContextLength) || maxContextLength <= 0) {
        logger.error(
          "Invalid max context length value. Please provide a positive integer.",
        );
      } else {
        config.setMaxContextLength(maxContextLength);
        logger.success(`Max context length set to ${maxContextLength}.`);
      }
    });

  program
    .command("get-config")
    .description("Display the entire configuration")
    .action(() => {
      const allConfig = config.getAll();
      logger.info("Current configuration:");
      console.log(JSON.stringify(allConfig, null, 2));
    });

  program
    .command("clear-config")
    .description("Clear stored configuration")
    .action(() => {
      config.clearConfig();
      logger.success("Configuration cleared.");
    });

  program.parse(process.argv);
}