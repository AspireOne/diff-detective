import { config, Provider } from "./config.ts";
import ora, { type Ora } from "ora";
import { logger } from "./logger.ts";
import { AiClient } from "./ai-client.ts";
import { git } from "./git.ts";
import { reviewUserPrompt } from "./prompts/review.user.ts";
import { reviewSystemPrompt } from "./prompts/review.system.ts";
import type { ReviewCliOptions } from "./cli.ts";
import { marked } from "marked";
import { markedTerminalInstance } from "./marked-terminal.ts";
import chalk from "chalk";
import { models } from "./models.ts";

const baseSpinnerText = "Reviewing changes...\n";

function checkModelProviderMismatch(model: string, provider: Provider): Provider | null {
  for (const [providerName, providerModels] of Object.entries(models) as [
    Provider,
    string[],
  ][]) {
    if (providerModels.includes(model) && provider !== providerName) {
      logger.warn(
        `Overriding active provider from ${provider} to ${providerName} for this session, because you specified an ${providerName} model (${model}).`,
      );
      return providerName;
    }
  }
  return null;
}

export async function review(cliOptions: ReviewCliOptions) {
  const model = cliOptions.model ?? config.getModel();
  let provider = cliOptions.provider ?? config.getActiveProvider();
  const maxTokens = cliOptions.maxTokens ?? config.getMaxTokens();
  const maxContextLength = cliOptions.maxContextLength ?? config.getMaxContextLength();

  const correctProvider = checkModelProviderMismatch(model, provider);
  if (correctProvider) provider = correctProvider;

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
  const stagedFiles = await git.getStagedFiles();

  const fileList = stagedFiles.map((f) => f.filename).join(", ");
  props.spinner.text = `Analyzing ${lineCount} lines of code ${chalk.italic.gray(fileList)}`;

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

  // @ts-expect-error - marked shourts that they're not compatible, but they are, and it is written in official docs.
  marked.use(markedTerminalInstance);
  console.log(marked.parse(aiResult));
}
