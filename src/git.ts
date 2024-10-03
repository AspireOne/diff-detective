import simpleGit, { type SimpleGit } from "simple-git";
import * as fs from "node:fs";
import * as path from "node:path";

const sGit = simpleGit();

async function getStagedChangesWithFullContent(): Promise<string> {
  const result = await sGit.raw(["--no-pager", "diff", "--cached", "--unified=3"]);
  return result;
}

function isGitRepository(): boolean {
  return fs.existsSync(path.join(process.cwd(), ".git"));
}

interface ExtendedGit extends SimpleGit {
  getStagedChangesWithFullContent: typeof getStagedChangesWithFullContent;
  isGitRepository: typeof isGitRepository;
}

export const git: ExtendedGit = Object.assign(sGit, {
  getStagedChangesWithFullContent,
  isGitRepository,
});
