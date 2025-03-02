import { config, Provider } from "./config.js";
import ora, { type Ora } from "ora";
import { logger } from "./logger.js";
import { AiClient } from "./ai-client.js";
import { git, type AnalysisStats } from "./git.js";
import * as path from "node:path";
import { reviewUserPrompt } from "./prompts/review.user.js";
import { reviewSystemPrompt } from "./prompts/review.system.js";
import type { ReviewCliOptions } from "./cli.js";
import { marked } from "marked";
import { markedTerminalInstance } from "./marked-terminal.js";
import chalk from "chalk";
import { models } from "./models.js";
import * as fs from "node:fs";

/**
 * Logs detailed statistics about what's being analyzed
 */
function logAnalysisStats(
  stats: AnalysisStats,
  stagedFiles: { filename: string; changes: number }[],
): void {
  logger.info(`Analysis Statistics:`);
  logger.info(`• Total files: ${stagedFiles.length}`);
  logger.info(`• Total changed lines: ${stats.totalChangedLines}`);
  logger.info(`• Total context lines: ${stats.totalContextLines}`);

  // Log each file with its stats
  logger.info(`\nFiles being analyzed:`);

  // Sort files by path for better readability
  const sortedFiles = [...stagedFiles].sort((a, b) =>
    a.filename.localeCompare(b.filename),
  );

  // Create a map for quick lookup of full context files
  const fullContextMap = new Map<
    string,
    {
      totalLines: number;
      changedLines: number;
      changePercentage: number;
    }
  >();

  stats.fullFileContexts.forEach((file) => {
    fullContextMap.set(file.filename, {
      totalLines: file.totalLines,
      changedLines: file.changedLines,
      changePercentage: file.changePercentage,
    });
  });

  // Log each file directly from the sorted stagedFiles array
  sortedFiles.forEach((file) => {
    const fullContextInfo = fullContextMap.get(file.filename);

    if (fullContextInfo) {
      logger.success(
        `${file.filename} - ${fullContextInfo.changedLines} changed lines (${fullContextInfo.changePercentage.toFixed(1)}%) - ` +
          `Full context included (${fullContextInfo.totalLines} lines)`,
      );
    } else {
      logger.warn(`${file.filename} - ${file.changes} changed lines - Diff only`);
    }
  });
}

/**
 * Smart truncation function that ensures XML tags aren't cut in the middle
 * It will include complete <full-file-context> blocks or exclude them entirely
 */
function smartTruncate(changes: string, maxLength: number): string {
  if (changes.length <= maxLength) return changes;

  // Find all full file context blocks
  const regex = /<full-file-context file="[^"]+">[\s\S]*?<\/full-file-context>/g;
  const matches = [...changes.matchAll(regex)];

  // If no matches or diff already exceeds max length, just truncate
  if (matches.length === 0 || matches[0].index! > maxLength) {
    return changes.substring(0, maxLength);
  }

  // Keep diff and add as many complete context blocks as will fit
  const diffPart = changes.substring(0, matches[0].index!);
  let result = diffPart;
  let remainingSpace = maxLength - diffPart.length;

  for (const match of matches) {
    const block = match[0];
    if (block.length <= remainingSpace) {
      result += block;
      remainingSpace -= block.length;
    } else {
      break;
    }
  }

  return result;
}

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

  const { content: rawChanges, stats } = await git.getStagedChangesWithFullContent(
    stagedFiles.map((f) => f.filename),
  );

  // Trim the changes to fit within the max context length
  // Use smart truncation to ensure XML tags aren't cut in the middle
  let changes = rawChanges;
  if (changes.length > props.maxContextLength) {
    logger.warn(
      `Changes exceed max context length (${changes.length} > ${props.maxContextLength}). Some context may be truncated.`,
    );
    changes = smartTruncate(changes, props.maxContextLength);
  }

  changes = changes.trim();

  // Log detailed statistics about what we're analyzing
  logAnalysisStats(stats, stagedFiles);

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

  // Create a more detailed spinner text with statistics
  const fileCount = stagedFiles.length;
  const fullFileCount = stats.fullFileContexts.length;
  // unused
  const fullFileLines = stats.fullFileContexts.reduce((sum, f) => sum + f.totalLines, 0);

  props.spinner.text = `Analyzing ${fileCount} files with ${stats.totalChangedLines} changed lines`;
  if (fullFileCount > 0) {
    props.spinner.text += ` (${fullFileCount} files with full context)`;
  }

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
