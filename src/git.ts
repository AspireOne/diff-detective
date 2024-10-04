import simpleGit, { type SimpleGit } from "simple-git";
import * as fs from "node:fs";
import * as path from "node:path";

interface StagedFile {
  filename: string;
  changes: number;
}

const sGit = simpleGit();

async function getStagedChangesWithFullContent(files: string[]): Promise<string> {
  const result = await sGit.raw([
    "--no-pager",
    "diff",
    "--cached",
    "--unified=3",
    ...files,
  ]);
  return result;
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

export const git: ExtendedGit = Object.assign(sGit, {
  getStagedChangesWithFullContent,
  isGitRepository,
  getStagedFiles,
});
