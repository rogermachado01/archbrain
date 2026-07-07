import { basename } from "node:path";
import { checkRepoFreshness, type FreshnessResult } from "./check-repo-freshness";
import { ownerForFile } from "./code/codeowners";
import { scanFrontendRepo } from "./code/scan-frontend-repo";
import { scanLambdaRepo } from "./code/scan-lambda-repo";
import { mapWithConcurrency } from "./concurrency";
import { syncWorktree } from "./git/worktree";
import { loadManifest, saveManifest } from "./manifest";
import { scanTerraform } from "./terraform/scan-terraform";
import {
  emptyManifest,
  ROOT_CONTEXT_ID,
  type ConceptFacts,
  type Environment,
  type GroupFact,
  type RepoMapConfig,
  type ScanManifest,
  type ScanResult,
} from "./types";

/** Reuses a repo's previously-scanned concepts from the manifest when its freshness check found no change. */
function cachedConceptsFor(manifest: ScanManifest, matches: (facts: ConceptFacts) => boolean): ConceptFacts[] {
  return Object.values(manifest.concepts)
    .map((entry) => entry.facts)
    .filter(matches);
}

async function withOwners(concepts: ConceptFacts[], repoDir: string): Promise<ConceptFacts[]> {
  return Promise.all(
    concepts.map(async (c) => ({ ...c, owner: (await ownerForFile(repoDir, c.sourceFiles[0] ?? repoDir)) ?? c.owner }))
  );
}

/** Rethrows any error from `fn` prefixed with what step was running, so a caller's final error message says why it failed, not just the raw git/fs error. */
export async function withContext<T>(step: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`okf-scan: failed to ${step}: ${reason}`);
  }
}

export interface ScanRunResult {
  scanResult: ScanResult;
  freshness: FreshnessResult[];
}

/**
 * Runs the freshness check and every repo scanner (terraform/lambda/frontend),
 * reusing cached concepts from `bundleDir`'s manifest for anything unchanged —
 * the orchestration the CLI's `main()` used to run inline, extracted here so
 * both the CLI and the pipeline API route handlers share one implementation.
 */
export async function scanRepos(
  config: RepoMapConfig,
  env: Environment,
  bundleDir: string,
  force: boolean,
  concurrencyGit: number,
  concurrencyScan: number,
): Promise<ScanRunResult> {
  const manifest: ScanManifest = force ? emptyManifest() : await loadManifest(bundleDir);

  const freshness = await checkRepoFreshness(config, env, manifest, concurrencyGit);
  const freshByKey = new Map(freshness.map((f) => [f.ref.key, f]));

  const terraformChanged = force || (freshByKey.get("terraform")?.changed ?? false);
  let concepts: ConceptFacts[] = [];
  let groups: GroupFact[] = [];
  let lambdaEnvVarBindings: Record<string, Record<string, string>> = {};

  if (config.terraform) {
    if (terraformChanged) {
      const tfResult = await withContext(`scan terraform at "${config.terraform.path}"`, () =>
        scanTerraform(config.terraform!, env)
      );
      concepts = tfResult.concepts;
      groups = tfResult.groups;
      lambdaEnvVarBindings = tfResult.lambdaEnvVarBindings;
    } else {
      concepts = cachedConceptsFor(manifest, (f) => f.parentId === ROOT_CONTEXT_ID);
      lambdaEnvVarBindings = manifest.lambdaEnvVarBindings ?? {};
    }
  }

  const lambdaResults = freshness.filter((f) => f.ref.kind === "lambda");
  const lambdaConceptLists = await mapWithConcurrency(lambdaResults, concurrencyScan, async (result) => {
    const resourceName = result.ref.key.split(".")[1];
    if (!result.changed && !terraformChanged) {
      return cachedConceptsFor(manifest, (f) => f.parentId === resourceName);
    }
    const entry = config.resources![result.ref.key];
    return withContext(`scan lambda repo "${result.ref.key}" (path "${entry.repo}")`, async () => {
      const worktreeDir = await syncWorktree(entry.repo, result.ref.key, entry.branch[env], env);
      const scanned = await scanLambdaRepo({
        repoDir: worktreeDir,
        containerId: resourceName,
        envVarBindings: lambdaEnvVarBindings[resourceName] ?? {},
      });
      return withOwners(scanned, worktreeDir);
    });
  });

  const frontendResults = freshness.filter((f) => f.ref.kind === "frontend");
  const frontendConceptLists = await mapWithConcurrency(frontendResults, concurrencyScan, async (result) => {
    if (!result.changed) {
      // Nested route hierarchy: components' parentId is a route/shared-ui id, not
      // the repo key — but every concept in this repo's tree has an id under the
      // repo key's path (ids double as bundle paths).
      return cachedConceptsFor(manifest, (f) => f.id === result.ref.key || f.id.startsWith(`${result.ref.key}/`));
    }
    const entry = config.frontend!.find((f) => basename(f.repo) === result.ref.key)!;
    return withContext(`scan frontend repo "${result.ref.key}" (path "${entry.repo}")`, async () => {
      const worktreeDir = await syncWorktree(entry.repo, result.ref.key, entry.branch[env], env);
      const scanned = await scanFrontendRepo({ repoDir: worktreeDir, containerId: result.ref.key, apiBaseUrls: {} });
      return withOwners(scanned, worktreeDir);
    });
  });

  concepts = concepts.concat(lambdaConceptLists.flat(), frontendConceptLists.flat());

  return { scanResult: { concepts, groups, lambdaEnvVarBindings }, freshness };
}

/**
 * Records this run's per-repo scanned ref and lambda env-var bindings into
 * `bundleDir`'s manifest, reloading it fresh first so per-concept hash/facts
 * entries `synthesize()` already wrote aren't clobbered by a stale in-memory copy.
 */
export async function recordScanManifest(
  bundleDir: string,
  freshness: FreshnessResult[],
  env: Environment,
  lambdaEnvVarBindings: Record<string, Record<string, string>>,
): Promise<void> {
  const manifest = await loadManifest(bundleDir);
  for (const result of freshness) {
    manifest._repos[result.ref.key] = { lastScannedRef: result.currentRef, env };
  }
  manifest.lambdaEnvVarBindings = lambdaEnvVarBindings;
  await saveManifest(bundleDir, manifest);
}
