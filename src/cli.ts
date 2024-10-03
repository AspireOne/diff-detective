import { Command } from "commander";
import { review } from "./review";
import {
  clearConfig,
  setApiKey,
  setActiveProvider,
  type Provider,
  setModel,
  getModel,
  getActiveProvider,
} from "./config";
import { packageJson } from "./package-json";
import { logger } from "./logger";

export function cli() {
  const program = new Command();

  program
    .name(packageJson.name)
    .description(packageJson.description)
    .version(packageJson.version);

  program
    .command("review")
    .description("Review staged changes")
    .option("-m, --model <model>", "Specify the model to use for this review")
    .action((options) => review(options.model));

  program
    .command("set-api-key <provider> <key>")
    .description("Set the API key for a specific provider")
    .action((provider: string, key: string) => {
      if (["openai", "anthropic", "openrouter"].includes(provider)) {
        setApiKey(provider as Provider, key);
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
        setActiveProvider(provider as Provider);
        logger.success(`Active provider set to ${provider}.`);
      } else {
        logger.error("Invalid provider. Use 'openai', 'anthropic', or 'openrouter'.");
      }
    });

  program
    .command("set-model <model>")
    .description("Set the default model to use")
    .action((model: string) => {
      setModel(model);
      logger.success(`Default model set to ${model}.`);
    });

  program
    .command("get-model")
    .description("Get the current default model")
    .action(() => {
      const model = getModel();
      if (model) {
        logger.info(`Current default model: ${model}`);
      } else {
        logger.success("No default model set.");
      }
    });

  program
    .command("get-provider")
    .description("Get the current active AI provider")
    .action(() => {
      const provider = getActiveProvider();
      if (provider) {
        logger.info(`Current active provider: ${provider}`);
      } else {
        logger.info("No active provider set.");
      }
    });

  program
    .command("clear-config")
    .description("Clear stored configuration")
    .action(() => {
      clearConfig();
      logger.success("Configuration cleared.");
    });

  program.parse(process.argv);
}
