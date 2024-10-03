import simpleGit from "simple-git";

const git = simpleGit();

export async function getStagedChanges(): Promise<string> {
  const diff = await git.diff(["--cached", "--no-color"]);
  return diff;
}
