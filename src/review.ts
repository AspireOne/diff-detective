import { getApiKey, getActiveProvider, getModel } from "./config";
import { getStagedChanges } from "./git";
import chalk from "chalk";
import ora from "ora";
import { logger } from "./logger";

export async function review(modelOverride?: string) {
  const spinner = ora("Reviewing changes...\n").start();

  try {
    const provider = getActiveProvider();
    const apiKey = await getApiKey(provider);
    const model = modelOverride || getModel() || "claude-3-5-sonnet-20240620"; // Fallback to Anthropic's default
    const stagedChanges = await getStagedChanges();

    // TODO: AI provider logic
    logger.info(`• Using provider: ${provider}`);
    logger.info(`• Using model: ${model}`);
    logger.info(`• API Key: ${apiKey.substring(0, 5)}...`);

    spinner.succeed("Review completed");
  } catch (error) {
    spinner.fail("Review failed");
    logger.error("Error:", error);
  }
}
