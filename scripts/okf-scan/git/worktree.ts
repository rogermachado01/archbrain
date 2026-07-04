import { mkdir } from "node:fs/promises";
import path from "node:path";
import simpleGit from "simple-git";

export const WORKTREE_CACHE_DIR = ".okf-scan-cache/worktrees";

export function worktreePath(repoKey: string, env: string): string {
  const safeName = repoKey.replace(/[^a-zA-Z0-9_-]/g, "-");
  return path.resolve(WORKTREE_CACHE_DIR, `${safeName}-${env}`);
}

async function worktreeExists(repoPath: string, target: string): Promise<boolean> {
  const list = await simpleGit(repoPath).raw(["worktree", "list", "--porcelain"]);
  return list.includes(target);
}

/**
 * Ensures a git worktree checked out to `branch` exists at a local, gitignored
 * cache path for (repoKey, env) — fetching from `origin` first. Only ever
 * reads `repoPath`'s `.git` metadata and fetches from it; never checks out or
 * writes to `repoPath`'s own working tree.
 */
export async function syncWorktree(repoPath: string, repoKey: string, branch: string, env: string): Promise<string> {
  const target = worktreePath(repoKey, env);
  const git = simpleGit(repoPath);
  await git.fetch("origin", branch);
  await mkdir(path.dirname(target), { recursive: true });

  if (await worktreeExists(repoPath, target)) {
    await simpleGit(target).checkout(branch);
    await simpleGit(target).pull("origin", branch);
  } else {
    await git.raw(["worktree", "add", "-f", target, `origin/${branch}`]);
  }
  return target;
}
