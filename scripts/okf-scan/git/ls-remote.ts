import simpleGit from "simple-git";

/**
 * Returns the current commit SHA of `branch` at `origin` for the repo at
 * `repoPath`, without cloning or fetching into a working tree — just asks
 * the remote directly. Note: this reads `repoPath`'s own refs (git treats a
 * local path passed directly as the remote itself), which is exactly what
 * check-repo-freshness.ts wants: the freshest state without touching any
 * working tree yet.
 */
export async function getRemoteBranchSha(repoPath: string, branch: string): Promise<string> {
  const git = simpleGit();
  const output = await git.listRemote(["--heads", repoPath, branch]);
  const line = output.trim().split("\n")[0];
  if (!line) {
    throw new Error(`branch "${branch}" not found for repo at ${repoPath}`);
  }
  return line.split("\t")[0];
}
