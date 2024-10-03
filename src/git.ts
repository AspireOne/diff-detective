import simpleGit, { type SimpleGit } from "simple-git";
import * as fs from "node:fs";
import * as path from "node:path";

interface StagedFile {
  filename: string;
  changes: number;
}

const sGit = simpleGit();

async function getStagedChangesWithFullContent(): Promise<string> {
  const result = await sGit.raw(["--no-pager", "diff", "--cached", "--unified=3"]);
  return result;
}

function isGitRepository(): boolean {
  return fs.existsSync(path.join(process.cwd(), ".git"));
}

export async function getStagedFiles(): Promise<StagedFile[]> {
  const numstat = await git.raw(["--no-pager", "diff", "--cached", "--numstat"]);

  return numstat
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const [additions, deletions, filename] = line.split("\t");
      const changes = parseInt(additions) + parseInt(deletions);
      return { filename, changes };
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
