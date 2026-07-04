import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import simpleGit from "simple-git";

export const WORKTREE_CACHE_DIR = ".okf-scan-cache/worktrees";

export function worktreePath(repoKey: string, env: string): string {
  const safeName = repoKey.replace(/[^a-zA-Z0-9_-]/g, "-");
  return path.resolve(WORKTREE_CACHE_DIR, `${safeName}-${env}`);
}

// `git worktree list --porcelain` always emits forward-slash paths, even on
// Windows, while `target` (built via `path.resolve` in `worktreePath`) is
// backslash-separated there — so a raw substring match never matches on
// Windows. Normalize both sides to forward slashes and compare each
// `worktree <path>` line's path, rather than a raw substring match.
async function worktreeRegistered(repoPath: string, target: string): Promise<boolean> {
  const list = await simpleGit(repoPath).raw(["worktree", "list", "--porcelain"]);
  const normalizedTarget = path.resolve(target).replace(/\\/g, "/");
  return list.split("\n").some((line) => {
    if (!line.startsWith("worktree ")) return false;
    const registeredPath = line.slice("worktree ".length).trim().replace(/\\/g, "/");
    return registeredPath === normalizedTarget;
  });
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

  let registered = await worktreeRegistered(repoPath, target);
  if (registered && !existsSync(target)) {
    // Git's metadata still lists this worktree, but its directory was
    // removed (e.g. manually deleted) — prune the stale registration and
    // fall through to re-adding it, instead of letting the reuse branch
    // below throw on a directory that no longer exists.
    await git.raw(["worktree", "prune"]);
    registered = false;
  }

  if (registered) {
    await simpleGit(target).checkout(branch);
    await simpleGit(target).pull("origin", branch);
  } else {
    await git.raw(["worktree", "add", "-f", target, `origin/${branch}`]);
  }
  return target;
}
