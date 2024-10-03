import { config } from "./config.ts";
import ora, { type Ora } from "ora";
import { logger } from "./logger.ts";
import { AiClient } from "./ai-client.ts";
import { git } from "./git.ts";
import { reviewUserPrompt } from "./prompts/review.user.ts";
import { reviewSystemPrompt } from "./prompts/review.system.ts";
import type { ReviewCliOptions } from "./cli.ts";

const baseSpinnerText = "Reviewing changes...\n";

export async function review(cliOptions: ReviewCliOptions) {
  const provider = cliOptions.provider ?? config.getActiveProvider();
  const model = cliOptions.model ?? config.getModel();
  const maxTokens = cliOptions.maxTokens ?? config.getMaxTokens();
  const maxContextLength = cliOptions.maxContextLength ?? config.getMaxContextLength();
  const apiKey = cliOptions.apiKey ?? (await config.getApiKeyOrAsk(provider));

  if (!git.isGitRepository()) {
    logger.error(" Not a git repository");
    return;
  }

  const status = await git.status();
  if (status.staged.length === 0) {
    logger.error(" No staged changes");
    return;
  }

  logger.info(`• Using provider: ${provider}`);
  logger.info(`• Using model: ${model}`);
  logger.info(`• API Key: ${apiKey.substring(0, 10)}...`);
  logger.info(`• Max tokens: ${maxTokens}`);
  logger.info(`• Max context length: ${maxContextLength}`);

  const spinner = ora({
    text: baseSpinnerText,
  }).start();
  spinner.render();

  try {
    const client = new AiClient(provider, apiKey);
    await execute({ client, model, spinner, maxTokens, maxContextLength });
  } catch (error) {
    spinner.fail(" Review failed: " + error);
    logger.error("Error:", error);
  }
}

async function execute(props: {
  client: AiClient;
  model: string;
  spinner: Ora;
  maxTokens: number;
  maxContextLength: number;
}) {
  let content = await git.getStagedChangesWithFullContent();
  content = content.trim().substring(0, props.maxContextLength);
  const lineCount = content.split("\n").length;

  props.spinner.text = `Analyzing ${lineCount} lines of code...`;

  const aiResult = await props.client.chatCompletion({
    model: props.model,
    maxTokens: props.maxTokens,
    temperature: 0.7,
    messages: [
      { role: "system", content: reviewSystemPrompt },
      { role: "user", content: reviewUserPrompt(content) },
    ],
  });

  props.spinner.stop();
  logger.info(aiResult);
}
