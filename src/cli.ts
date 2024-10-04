import { Command, Option } from "commander";
import { review } from "./review.js";
import { config } from "./config.js";
import type { Provider } from "./config.js";
import { packageJson } from "./package-json.js";
import { logger } from "./logger.js";
import { ProvidersEnum } from "./config.js";
import * as fs from "node:fs";

// Define it like this so that we can check it during runtime.
const reviewCliOptions = {
  model: "",
  provider: "" as Provider,
  maxContextLength: 1 as number,
  apiKey: "",
  promptPath: "",
  prompt: "",
  ignore: [] as string[],
};

export type ReviewCliOptions = Partial<typeof reviewCliOptions>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ensureReviewParamsValidity(options: any) {
  // If options contains any key that is not in ReviewCliOptions, throw an error
  for (const key in options) {
    if (!(key in reviewCliOptions)) {
      throw new Error(`Option name mismatch: ${key} - this is a bug`);
    }
  }

  const typedOptions = options as ReviewCliOptions;
  if (typedOptions.promptPath && typedOptions.prompt) {
    logger.error(
      "You cannot specify both --prompt and --prompt-path. Please choose one.",
    );
    process.exit(1);
  }
}

export function cli() {
  const program = new Command();

  program
    .name(packageJson.name)
    .description(packageJson.description)
    .version(packageJson.version)
    .description("Review staged changes")
    .option(
      `-m, --model <model>`,
      `Specify the model to use for this review (the active provider must support it) (gpt-4o, claude-3-5-sonnet-20240620, anthropic/claude-3.5-sonnet:beta, etc. ...) (using: ${config.getModel()})`,
    )
    .addOption(
      new Option(
        `-pr, --provider <provider>`,
        `Specify the provider to use for this review (using: ${config.getActiveProvider()}, unless a known model of different provider is selected)`,
      ).choices(Object.values(ProvidersEnum)),
    )
    .option(`-a, --api-key <apiKey>`, `Specify the API key to use for this review`)
    .option(
      `-pp, --prompt-path <customPromptPath>`,
      `Specify your prompt in a file and put {{CONTEXT}} where you want the context to be inserted. Then pass the path to the file`,
    )
    .option(
      `-p, --prompt <customPromptPath>`,
      `Specify your prompt directly. The context will be injected into the end of your prompt.`,
    )
    .option(
      `-mcl, --max-context-length <maxContextLength>`,
      `Specify the max context length to leverage for this review (in characters/letters! 200k chars ~= 40k tokens) (using: ${String(config.getMaxContextLength())})`,
    )
    .option(
      `-i, --ignore <items...>`,
      `Specify files or directories to be ignored by the tool`,
    )
    .action(async (options) => {
      ensureReviewParamsValidity(options);
      await review(options as ReviewCliOptions);
    });

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
    .command("set-custom-prompt-path <model>")
    .description(
      "Set the default prompt to use (include {{CONTEXT}} where you want the context to be inserted)",
    )
    .action((path: string) => {
      if (!fs.existsSync(path)) {
        logger.error(`Custom prompt file ${path} does not exist.`);
        return;
      }
      config.setCustomPromptPath(path);
      logger.success(`Default prompt set to ${path}.`);
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

  program
    .command("set-ignored-files <files...>")
    .description("Set the files or directories to be ignored")
    .action((files: string[]) => {
      config.setIgnoredFiles(files);
      logger.success(`Ignored files/directories set: ${files.join(", ")}`);
    });

  program.parse(process.argv);
}
