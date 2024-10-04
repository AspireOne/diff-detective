import { config, Provider } from "./config.js";
import ora, { type Ora } from "ora";
import { logger } from "./logger.js";
import { AiClient } from "./ai-client.js";
import { git } from "./git.js";
import * as path from "node:path";
import { reviewUserPrompt } from "./prompts/review.user.js";
import { reviewSystemPrompt } from "./prompts/review.system.js";
import type { ReviewCliOptions } from "./cli.js";
import { marked } from "marked";
import { markedTerminalInstance } from "./marked-terminal.js";
import chalk from "chalk";
import { models } from "./models.js";
import * as fs from "node:fs";

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
  const maxContextLength = cliOptions.maxContextLength ?? config.getMaxContextLength();
  const ignoredFiles = [...(cliOptions.ignore || []), ...config.getIgnoredFiles()];
  let customPrompt: string | null = null;

  if (cliOptions.prompt) {
    customPrompt = cliOptions.prompt.substring(0, 500_000);
  } else if (cliOptions.promptPath || config.getCustomPromptPath()) {
    const path = (cliOptions.promptPath ?? config.getCustomPromptPath())!;
    if (!fs.existsSync(path)) {
      logger.error(`Custom prompt file ${path} does not exist.`);
      return;
    }

    customPrompt = fs.readFileSync(path, "utf8");
    customPrompt = customPrompt.trim().substring(0, 500_000);
    if (!customPrompt || customPrompt.length === 0) {
      logger.error(`Custom prompt file ${path} is empty.`);
    }
  }

  const correctedProvider = checkModelProviderMismatch(model, provider);
  if (correctedProvider) provider = correctedProvider;

  const apiKey = cliOptions.apiKey ?? (await config.getApiKeyOrAsk(provider));

  logger.info(`• Using provider: ${provider}`);
  logger.info(`• Using model: ${model}`);
  logger.info(`• Max context length: ${maxContextLength}`);
  logger.info(`• Ignoring ${ignoredFiles.length} file(s): ${ignoredFiles.join(", ")}`);
  if (customPrompt) {
    logger.info(`• Using a custom prompt: ${customPrompt.substring(0, 30)}...`);
  }

  const spinner = ora({ text: "Reviewing changes...\n" }).start();

  try {
    const client = new AiClient(provider, apiKey);
    await execute({
      client,
      model,
      spinner,
      maxContextLength,
      customPrompt,
      ignoredFiles,
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
  maxContextLength: number;
  customPrompt?: string | null;
  ignoredFiles: string[];
}) {
  const stagedFiles = await git.getStagedFiles(props.ignoredFiles);

  if (stagedFiles.length === 0) {
    logger.warn("After filtering ignored files, there are no staged files left.");
    process.exit(0);
  }

  let changes = await git.getStagedChangesWithFullContent(
    stagedFiles.map((f) => f.filename),
  );

  changes = changes.trim().substring(0, props.maxContextLength);

  let prompt;

  if (props.customPrompt) {
    if (props.customPrompt.includes("{{CONTEXT}}")) {
      prompt = props.customPrompt.replace("{{CONTEXT}}", changes);
    } else {
      prompt = props.customPrompt + "\n\n" + `<code>${changes}</code>`;
    }
  } else {
    prompt = reviewUserPrompt(changes);
  }

  const lineCount = changes.split("\n").length;
  const fileList = stagedFiles.map((f) => f.filename).join(", ");
  props.spinner.text = `Analyzing ${lineCount} lines of code ${chalk.italic.gray(fileList)}`;

  const aiResult = await props.client.chatCompletion({
    model: props.model,
    temperature: 0.7,
    messages: [
      { role: "system", content: reviewSystemPrompt },
      { role: "user", content: prompt },
    ],
  });

  props.spinner.stop();

  // @ts-expect-error - marked shouts that they're not compatible, but they are, and it is written in official docs.
  marked.use(markedTerminalInstance);
  console.log(marked.parse(aiResult));
}
