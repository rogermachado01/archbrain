import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { loadRepoMap } from "./repo-map";
import { recordScanManifest, scanRepos } from "./scan-repos";
import { createAnthropicActorInferenceClient } from "./synthesize/actors";
import { createAnthropicLlmClient } from "./synthesize/llm";
import {
  applyMaterializationProposal,
  proposalPath,
  proposeMaterialization,
  writeProposal,
  type MaterializationProposal,
} from "./synthesize/materialize";
import { createAnthropicOrganizerClient } from "./synthesize/organize";
import { synthesize } from "./synthesize/synthesize";
import { loadManifest } from "./manifest";
import { emptyManifest, type Environment } from "./types";

export interface CliArgs {
  repoMap: string;
  env: Environment;
  out: string;
  force: boolean;
  concurrencyGit: number;
  concurrencyScan: number;
  concurrencyLlm: number;
  materialize?: "propose" | "apply";
  plan?: string;
}

const USAGE =
  "Usage: okf-scan --repo-map <path> --env <dev|hml|prd> --out <bundleDir> [--force] [--concurrency-git N] [--concurrency-scan N] [--concurrency-llm N] [--materialize propose|apply] [--plan <path>]";

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

  const materializeRaw = get("--materialize");
  if (materializeRaw && materializeRaw !== "propose" && materializeRaw !== "apply") {
    throw new Error(`--materialize must be one of propose, apply (got "${materializeRaw}")`);
  }

  return {
    repoMap,
    env,
    out,
    force: argv.includes("--force"),
    concurrencyGit: Number(get("--concurrency-git") ?? 20),
    concurrencyScan: Number(get("--concurrency-scan") ?? 4),
    concurrencyLlm: Number(get("--concurrency-llm") ?? 6),
    materialize: materializeRaw as "propose" | "apply" | undefined,
    plan: get("--plan"),
  };
}

/** Rethrows any error from `fn` prefixed with what step was running, so the CLI's final error message says why it failed, not just the raw git/fs error. */
async function withContext<T>(step: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`okf-scan: failed to ${step}: ${reason}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config = await loadRepoMap(args.repoMap);
  const { scanResult, freshness } = await scanRepos(config, args.env, args.out, args.force, args.concurrencyGit, args.concurrencyScan);
  let { concepts, groups, lambdaEnvVarBindings } = scanResult;

  if (args.materialize === "propose") {
    const organizer = createAnthropicOrganizerClient();
    const actorClient = createAnthropicActorInferenceClient();
    const manifestForSkip = args.force ? emptyManifest() : await loadManifest(args.out);
    const alreadyMaterialized = new Set(Object.keys(manifestForSkip.materializedContainers ?? {}));
    const proposal = await proposeMaterialization(
      { concepts, groups, lambdaEnvVarBindings },
      organizer,
      actorClient,
      alreadyMaterialized,
    );
    await writeProposal(args.out, proposal);
    console.log(
      `okf-scan: wrote materialization proposal to ${proposalPath(args.out)} (${proposal.containerPlans.length} container plan(s), ${proposal.actorProposals.length} actor proposal(s))`,
    );
    return;
  }

  let newlyMaterializedContainerIds: string[] = [];
  if (args.materialize === "apply") {
    if (!args.plan) throw new Error("--materialize=apply requires --plan <path>");
    // Reads/parses directly rather than calling readProposal(bundleDir): --plan is a free-form
    // path a human may have relocated or hand-edited, while readProposal is hardwired to the
    // default in-bundle filename.
    const proposal = await withContext(`read materialization plan from "${args.plan}"`, async () => {
      const proposalRaw = await readFile(args.plan!, "utf-8");
      return JSON.parse(proposalRaw) as MaterializationProposal;
    });
    const applied = applyMaterializationProposal({ concepts, groups, lambdaEnvVarBindings }, proposal);
    concepts = applied.concepts;
    newlyMaterializedContainerIds = proposal.containerPlans.map((p) => p.containerId);
  }

  const llm = createAnthropicLlmClient();
  const organizer = createAnthropicOrganizerClient();
  const summary = await synthesize({
    scanResult: { concepts, groups, lambdaEnvVarBindings },
    bundleDir: args.out,
    llm,
    organizer,
    force: args.force,
    concurrency: args.concurrencyLlm,
    newlyMaterializedContainerIds,
  });

  await recordScanManifest(args.out, freshness, args.env, lambdaEnvVarBindings);

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
