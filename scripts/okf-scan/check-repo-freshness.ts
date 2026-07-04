import { readdir } from "node:fs/promises";
import path from "node:path";
import { mapWithConcurrency } from "./concurrency";
import { getRemoteBranchSha } from "./git/ls-remote";
import { hashContent } from "./hash";
import { parseTerraformDir } from "./terraform/hcl";
import type { Environment, ManifestRepoEntry, RepoMapConfig, ScanManifest } from "./types";

export interface RepoRef {
  key: string;
  kind: "terraform" | "lambda" | "frontend";
  repoPath: string;
  branch?: string;
}

/** Every repo a scan run touches, keyed the same way in the manifest and in worktree naming. */
export function listRepoRefs(config: RepoMapConfig, env: Environment): RepoRef[] {
  const refs: RepoRef[] = [{ key: "terraform", kind: "terraform", repoPath: config.terraform.path }];
  for (const [address, entry] of Object.entries(config.resources)) {
    refs.push({ key: address, kind: "lambda", repoPath: entry.repo, branch: entry.branch[env] });
  }
  for (const entry of config.frontend) {
    refs.push({ key: path.basename(entry.repo), kind: "frontend", repoPath: entry.repo, branch: entry.branch[env] });
  }
  return refs;
}

async function currentRefFor(ref: RepoRef, config: RepoMapConfig, env: Environment): Promise<string> {
  if (ref.kind === "terraform") {
    const entries = await readdir(ref.repoPath);
    const excluded = new Set(
      Object.entries(config.terraform.envFiles)
        .filter(([e]) => e !== env)
        .map(([, file]) => file)
    );
    const files = entries.filter((f) => f.endsWith(".tf") && !excluded.has(f)).sort();
    const { fileContents } = await parseTerraformDir(ref.repoPath, files);
    return `sha256:${hashContent(files.map((f) => fileContents[f]).join("\n"))}`;
  }
  return getRemoteBranchSha(ref.repoPath, ref.branch!);
}

export interface FreshnessResult {
  ref: RepoRef;
  currentRef: string;
  changed: boolean;
}

/** Cheap pre-check, run before any worktree sync or scanning: which repos actually need work this run. */
export async function checkRepoFreshness(
  config: RepoMapConfig,
  env: Environment,
  manifest: ScanManifest,
  concurrency = 20
): Promise<FreshnessResult[]> {
  const refs = listRepoRefs(config, env);
  return mapWithConcurrency(refs, concurrency, async (ref) => {
    const current = await currentRefFor(ref, config, env);
    const previous: ManifestRepoEntry | undefined = manifest._repos[ref.key];
    const changed = !previous || previous.env !== env || previous.lastScannedRef !== current;
    return { ref, currentRef: current, changed };
  });
}
