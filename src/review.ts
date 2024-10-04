import { config, Provider } from "./config.js";
import ora, { type Ora } from "ora";
import { logger } from "./logger.js";
import { AiClient } from "./ai-client.js";
import { git } from "./git.js";
import { reviewUserPrompt } from "./prompts/review.user.js";
import { reviewSystemPrompt } from "./prompts/review.system.js";
import type { ReviewCliOptions } from "./cli.js";
import { marked } from "marked";
import { markedTerminalInstance } from "./marked-terminal.js";
import chalk from "chalk";
import { models } from "./models.js";
import * as fs from "node:fs";

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
  if (!git.isGitRepository()) {
    return logger.error(" Not a git repository");
  }

  const status = await git.status();
  if (status.staged.length === 0) {
    return logger.error(" No staged changes");
  }

  const model = cliOptions.model ?? config.getModel();
  let provider = cliOptions.provider ?? config.getActiveProvider();
  const maxTokens = cliOptions.maxTokens ?? config.getMaxTokens();
  const maxContextLength = cliOptions.maxContextLength ?? config.getMaxContextLength();
  let customPrompt: string | null = null;

  if (cliOptions.prompt) {
    customPrompt = cliOptions.prompt;
  } else if (cliOptions.promptPath) {
    if (!fs.existsSync(cliOptions.promptPath)) {
      logger.error(`Custom prompt file ${cliOptions.promptPath} does not exist.`);
      return;
    }

    customPrompt = fs.readFileSync(cliOptions.promptPath, "utf8");
    customPrompt = customPrompt.trim().substring(0, 250_000);
    if (!customPrompt || customPrompt.length === 0) {
      logger.error(`Custom prompt file ${cliOptions.promptPath} is empty.`);
    }
  }

  const correctProvider = checkModelProviderMismatch(model, provider);
  if (correctProvider) provider = correctProvider;

  const apiKey = cliOptions.apiKey ?? (await config.getApiKeyOrAsk(provider));

  logger.info(`• Using provider: ${provider}`);
  logger.info(`• Using model: ${model}`);
  logger.info(`• Max tokens: ${maxTokens}`);
  logger.info(`• Max context length: ${maxContextLength}`);
  if (customPrompt) {
    logger.info(`• Using a custom prompt: ${customPrompt.substring(0, 30)}...`);
  }

  const spinner = ora({ text: baseSpinnerText }).start();

  try {
    const client = new AiClient(provider, apiKey);
    await execute({
      client,
      model,
      spinner,
      maxTokens,
      maxContextLength,
      customPrompt,
    });
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
  customPrompt?: string | null;
}) {
  let changes = await git.getStagedChangesWithFullContent();
  changes = changes.trim().substring(0, props.maxContextLength);

  let prompt;

  if (props.customPrompt) {
    if (props.customPrompt.includes("{{CONTEXT}}")) {
      prompt = props.customPrompt.replace("{{CONTEXT}}", changes);
    } else {
      prompt = `${props.customPrompt}\n\n<code>${changes}</code>`;
    }
  } else {
    prompt = reviewUserPrompt(changes);
  }

  const lineCount = changes.split("\n").length;
  const stagedFiles = await git.getStagedFiles();

  const fileList = stagedFiles.map((f) => f.filename).join(", ");
  props.spinner.text = `Analyzing ${lineCount} lines of code ${chalk.italic.gray(fileList)}`;

  const aiResult = await props.client.chatCompletion({
    model: props.model,
    maxTokens: props.maxTokens,
    temperature: 0.7,
    messages: [
      { role: "system", content: reviewSystemPrompt },
      { role: "user", content: prompt },
    ],
  });

  props.spinner.stop();

  // @ts-expect-error - marked shourts that they're not compatible, but they are, and it is written in official docs.
  marked.use(markedTerminalInstance);
  console.log(marked.parse(aiResult));
}
