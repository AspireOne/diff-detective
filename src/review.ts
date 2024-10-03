import { getOpenAIKey } from "./config";
import { getStagedChanges } from "./git";
import chalk from "chalk";
import ora from "ora";
import { logger } from "./logger";

export async function review() {
  const spinner = ora("Reviewing changes...").start();

  try {
    const apiKey = await getOpenAIKey();
    const stagedChanges = await getStagedChanges();

    // TODO: Openai logic
  } catch (error) {
    spinner.fail("Review failed");
    logger.error(chalk.red("Error:", error));
  }
}
