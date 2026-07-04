import { basename } from "node:path";
import { checkRepoFreshness } from "./check-repo-freshness";
import { ownerForFile } from "./code/codeowners";
import { scanFrontendRepo } from "./code/scan-frontend-repo";
import { scanLambdaRepo } from "./code/scan-lambda-repo";
import { mapWithConcurrency } from "./concurrency";
import { syncWorktree } from "./git/worktree";
import { loadManifest, saveManifest } from "./manifest";
import { loadRepoMap } from "./repo-map";
import { createAnthropicLlmClient } from "./synthesize/llm";
import { synthesize } from "./synthesize/synthesize";
import { scanTerraform } from "./terraform/scan-terraform";
import { emptyManifest, ROOT_CONTEXT_ID, type ConceptFacts, type Environment, type GroupFact, type ScanManifest } from "./types";

export interface CliArgs {
  repoMap: string;
  env: Environment;
  out: string;
  force: boolean;
  concurrencyGit: number;
  concurrencyScan: number;
  concurrencyLlm: number;
}

const USAGE =
  "Usage: okf-scan --repo-map <path> --env <dev|hml|prd> --out <bundleDir> [--force] [--concurrency-git N] [--concurrency-scan N] [--concurrency-llm N]";

export function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx === -1 ? undefined : argv[idx + 1];
  };

  const repoMap = get("--repo-map");
  const env = get("--env");
  const out = get("--out");
  if (!repoMap || !env || !out) throw new Error(USAGE);
  if (env !== "dev" && env !== "hml" && env !== "prd") {
    throw new Error(`--env must be one of dev, hml, prd (got "${env}")`);
  }

  return {
    repoMap,
    env,
    out,
    force: argv.includes("--force"),
    concurrencyGit: Number(get("--concurrency-git") ?? 20),
    concurrencyScan: Number(get("--concurrency-scan") ?? 4),
    concurrencyLlm: Number(get("--concurrency-llm") ?? 6),
  };
}

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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config = await loadRepoMap(args.repoMap);
  const manifest: ScanManifest = args.force ? emptyManifest() : await loadManifest(args.out);

  const freshness = await checkRepoFreshness(config, args.env, manifest, args.concurrencyGit);
  const freshByKey = new Map(freshness.map((f) => [f.ref.key, f]));

  const terraformChanged = args.force || freshByKey.get("terraform")!.changed;
  let concepts: ConceptFacts[];
  let groups: GroupFact[];
  let lambdaEnvVarBindings: Record<string, Record<string, string>>;

  if (terraformChanged) {
    const tfResult = await scanTerraform(config.terraform, args.env);
    concepts = tfResult.concepts;
    groups = tfResult.groups;
    lambdaEnvVarBindings = tfResult.lambdaEnvVarBindings;
  } else {
    concepts = cachedConceptsFor(manifest, (f) => f.parentId === ROOT_CONTEXT_ID);
    groups = [];
    lambdaEnvVarBindings = manifest.lambdaEnvVarBindings ?? {};
  }

  const lambdaResults = freshness.filter((f) => f.ref.kind === "lambda");
  const lambdaConceptLists = await mapWithConcurrency(lambdaResults, args.concurrencyScan, async (result) => {
    const resourceName = result.ref.key.split(".")[1];
    if (!result.changed && !terraformChanged) {
      return cachedConceptsFor(manifest, (f) => f.parentId === resourceName);
    }
    const entry = config.resources[result.ref.key];
    const worktreeDir = await syncWorktree(entry.repo, result.ref.key, entry.branch[args.env], args.env);
    const scanned = await scanLambdaRepo({
      repoDir: worktreeDir,
      containerId: resourceName,
      envVarBindings: lambdaEnvVarBindings[resourceName] ?? {},
    });
    return withOwners(scanned, worktreeDir);
  });

  const frontendResults = freshness.filter((f) => f.ref.kind === "frontend");
  const frontendConceptLists = await mapWithConcurrency(frontendResults, args.concurrencyScan, async (result) => {
    if (!result.changed) return cachedConceptsFor(manifest, (f) => f.parentId === result.ref.key);
    const entry = config.frontend.find((f) => basename(f.repo) === result.ref.key)!;
    const worktreeDir = await syncWorktree(entry.repo, result.ref.key, entry.branch[args.env], args.env);
    const scanned = await scanFrontendRepo({ repoDir: worktreeDir, containerId: result.ref.key, apiBaseUrls: {} });
    return withOwners(scanned, worktreeDir);
  });

  concepts = concepts.concat(lambdaConceptLists.flat(), frontendConceptLists.flat());

  const llm = createAnthropicLlmClient();
  const summary = await synthesize({
    scanResult: { concepts, groups, lambdaEnvVarBindings },
    bundleDir: args.out,
    llm,
    force: args.force,
    concurrency: args.concurrencyLlm,
  });

  // synthesize() loads its own copy of the manifest (from an empty one when
  // `force` is set, same as above), updates `concepts` with fresh per-concept
  // hash/facts entries, and unconditionally saves that to disk itself before
  // returning. Reload here rather than reusing this function's pre-synthesis
  // `manifest` var — otherwise the save below would overwrite synthesize()'s
  // concept updates with the stale pre-synthesis copy.
  const postSynthesizeManifest = await loadManifest(args.out);
  for (const result of freshness) {
    postSynthesizeManifest._repos[result.ref.key] = { lastScannedRef: result.currentRef, env: args.env };
  }
  postSynthesizeManifest.lambdaEnvVarBindings = lambdaEnvVarBindings;
  await saveManifest(args.out, postSynthesizeManifest);

  console.log(`okf-scan: wrote ${summary.written.length}, skipped ${summary.skipped.length} concept(s) into ${args.out}`);
  if (summary.needsReview.length > 0) {
    console.log(`okf-scan: ${summary.needsReview.length} concept(s) need manual review:`);
    for (const item of summary.needsReview) {
      console.log(`  - ${item.id}:`);
      item.notes.forEach((note) => console.log(`      ${note}`));
    }
  }
  if (summary.failed.length > 0) {
    console.log(`okf-scan: ${summary.failed.length} concept(s) failed and will be retried on the next run:`);
    for (const item of summary.failed) {
      console.log(`  - ${item.id}: ${item.error}`);
    }
  }

  const sourceId = basename(args.out);
  console.log(`\nAdd this to DATA_SOURCES in src/lib/data-sources.ts:\n`);
  console.log(
    `  {\n    id: "${sourceId}",\n    label: "${sourceId}",\n    load: () => importOkfBundle("/okf-bundles/${sourceId}").then(validateArchModel),\n    okfBasePath: "/okf-bundles/${sourceId}",\n  },`
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
