import simpleGit, { type SimpleGit } from "simple-git";
import * as fs from "node:fs";
import * as path from "node:path";
import { logger } from "./logger.js";
import { promisify } from "node:util";
import { exec } from "node:child_process";

interface StagedFile {
  filename: string;
  changes: number;
}

const sGit = simpleGit();

// Maximum file size to include in full (in bytes)
const MAX_FULL_FILE_SIZE = 100 * 1024; // 100KB
// Maximum percentage of changes to consider a file "small change"
const SMALL_CHANGE_THRESHOLD = 10; // 10%
// Minimum number of lines to consider a file for full inclusion
const MIN_LINES_FOR_FULL_INCLUSION = 10;
// Maximum number of lines to include in full
const MAX_LINES_FOR_FULL_INCLUSION = 1000;

// Function to check if a file is binary
async function isBinaryFile(filePath: string): Promise<boolean> {
  try {
    // Use git's internal mechanism to detect binary files
    const execPromise = promisify(exec);
    const { stdout } = await execPromise(`git diff --cached --numstat "${filePath}"`);

    // If the file is binary, git outputs "-" for both additions and deletions
    if (stdout.trim().startsWith("-\t-\t")) {
      return true;
    }

    // Additional check: read a small chunk of the file and look for null bytes
    const buffer = Buffer.alloc(4096);
    const fd = fs.openSync(filePath, "r");
    const bytesRead = fs.readSync(fd, buffer, 0, 4096, 0);
    fs.closeSync(fd);

    // Check for null bytes in the first 4KB, which typically indicates a binary file
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error(`Error checking if ${filePath} is binary: ${error}`);
    // If we can't determine, assume it's binary to be safe
    return true;
  }
}

// Statistics interface to track detailed information about the analysis
interface AnalysisStats {
  totalChangedLines: number;
  totalContextLines: number;
  fullFileContexts: {
    filename: string;
    totalLines: number;
    changedLines: number;
    changePercentage: number;
  }[];
}

async function getStagedChangesWithFullContent(
  files: string[],
): Promise<{ content: string; stats: AnalysisStats }> {
  const existingFiles = files.filter((file) => fs.existsSync(file));
  const deletedFiles = files.filter((file) => !fs.existsSync(file));

  let result = "";
  let fullFileContexts = "";

  // Initialize statistics
  const stats: AnalysisStats = {
    totalChangedLines: 0,
    totalContextLines: 0,
    fullFileContexts: [],
  };

  // Process existing files
  if (existingFiles.length > 0) {
    // First get the standard diff with context
    result = await sGit.raw([
      "--no-pager",
      "diff",
      "--cached",
      "--unified=25",
      ...existingFiles,
    ]);

    // Count changed lines and context lines in the diff
    const diffLines = result.split("\n");
    for (const line of diffLines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        stats.totalChangedLines++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        stats.totalChangedLines++;
      } else if (
        !line.startsWith("@@") &&
        !line.startsWith("diff") &&
        !line.startsWith("index") &&
        !line.startsWith("+++") &&
        !line.startsWith("---")
      ) {
        stats.totalContextLines++;
      }
    }

    // Then check each file to see if we should include it in full
    for (const file of existingFiles) {
      try {
        // Skip binary files and very large files
        const fileStats = fs.statSync(file);
        if (fileStats.size > MAX_FULL_FILE_SIZE) {
          continue;
        }

        // Check if the file is binary
        if (await isBinaryFile(file)) {
          logger.info(`Skipping binary file: ${file}`);
          continue;
        }

        // Get the diff stats to determine change percentage
        const diffStats = await sGit.raw(["diff", "--cached", "--numstat", file]);

        if (!diffStats.trim()) continue;

        // If the file is binary, git outputs "-" for both additions and deletions
        if (diffStats.trim().startsWith("-\t-\t")) {
          continue;
        }

        const [additions, deletions] = diffStats.trim().split("\t");

        // Skip if we can't parse the numbers (might be binary file markers)
        if (isNaN(parseInt(additions)) || isNaN(parseInt(deletions))) {
          continue;
        }

        const changedLines = parseInt(additions) + parseInt(deletions);

        // Try to read the file content with utf8 encoding
        let fileContent;
        try {
          fileContent = fs.readFileSync(file, "utf8");
        } catch (error) {
          logger.error(`Error reading file ${file}: ${error}`);
          continue;
        }

        const totalLines = fileContent.split("\n").length;

        // Calculate change percentage
        const changePercentage = (changedLines / totalLines) * 100;

        // Include full file if:
        // 1. It's a small change (percentage below threshold)
        // 2. The file is not too small (at least MIN_LINES_FOR_FULL_INCLUSION lines)
        // 3. The file is not too large (at most MAX_LINES_FOR_FULL_INCLUSION lines)
        if (
          changePercentage <= SMALL_CHANGE_THRESHOLD &&
          totalLines >= MIN_LINES_FOR_FULL_INCLUSION &&
          totalLines <= MAX_LINES_FOR_FULL_INCLUSION
        ) {
          fullFileContexts += `\n\n<full-file-context file="${file}">\n${fileContent}\n</full-file-context>\n\n`;
          logger.info(
            `Including full file context for ${file} (${totalLines} lines, ${changePercentage.toFixed(1)}% changed)`,
          );

          // Add to statistics
          stats.fullFileContexts.push({
            filename: file,
            totalLines,
            changedLines,
            changePercentage,
          });
        }
      } catch (error) {
        logger.error(`Error processing file ${file} for full context: ${error}`);
      }
    }
  }

  // Process deleted files
  if (deletedFiles.length > 0) {
    const deletedChanges = await sGit.raw([
      "--no-pager",
      "diff",
      "--cached",
      "--unified=25",
      "--",
      ...deletedFiles,
    ]);
    result += (result ? "\n" : "") + deletedChanges;
  }

  // Combine the diff and full file contexts
  return {
    content: result + fullFileContexts,
    stats,
  };
}

function isGitRepository(): boolean {
  return fs.existsSync(path.join(process.cwd(), ".git"));
}

async function getStagedFiles(ignoredFiles: string[] = []): Promise<StagedFile[]> {
  const numstat = await sGit.raw(["--no-pager", "diff", "--cached", "--numstat"]);

  return numstat
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const [additions, deletions, filename] = line.split("\t");
      const changes = parseInt(additions) + parseInt(deletions);
      return { filename, changes };
    })
    .filter((file) => !isIgnored(file.filename, ignoredFiles));
}

function isIgnored(filename: string, ignoredPatterns: string[]): boolean {
  return ignoredPatterns.some((pattern) => {
    if (pattern.endsWith("/")) {
      // It's a directory, check if the file is inside this directory
      return filename.startsWith(pattern);
    } else if (pattern.includes("*")) {
      // It's a glob pattern, use simple wildcard matching
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return regex.test(filename);
    } else {
      // It's a specific file, check for exact match
      return filename === pattern;
    }
  });
}

interface ExtendedGit extends SimpleGit {
  getStagedChangesWithFullContent: typeof getStagedChangesWithFullContent;
  isGitRepository: typeof isGitRepository;
  getStagedFiles: typeof getStagedFiles;
}

// Export the AnalysisStats interface for use in other files
export type { AnalysisStats };

export const git: ExtendedGit = Object.assign(sGit, {
  getStagedChangesWithFullContent,
  isGitRepository,
  getStagedFiles,
});
