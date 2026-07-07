# Visual OKF Pipeline Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/pipeline` page that replaces the CLI-driven `okf-scan` workflow shown in `fluxo.txt` (repo-map edit → run → materialize propose/review/apply → validate) with a visual wizard, backed by a small set of Next.js Route Handlers that call directly into `scripts/okf-scan/**`.

**Architecture:** Extract the CLI's inline orchestration (`scripts/okf-scan/index.ts`'s `main()`) into two reusable functions in a new `scripts/okf-scan/scan-repos.ts`, so both the CLI and the new route handlers share one implementation. Add a `@okf-scan/*` path alias so route handlers/components can import from `scripts/okf-scan/**` cleanly. Five route handlers under `src/app/api/pipeline/` wrap `loadRepoMap`/`saveRepoMap`, `scanRepos`, `synthesize`, `proposeMaterialization`/`applyMaterializationProposal`, and `validateArchModel` — no subprocess spawning. A client-side wizard (`src/components/pipeline/*`) drives these endpoints step by step, with one new piece of pure client logic (a proposal-editing reducer mirroring the `okf-scan-humanize` skill's accept/rename/merge/drop review model).

**Tech Stack:** TypeScript, Next.js 16 Route Handlers, React 19, Vitest, `yaml`, `zod` (all already dependencies — no new packages).

**Before starting:** this plan implements `docs/superpowers/specs/2026-07-07-pipeline-visual-flow-design.md`. Read that spec's "Non-goals" section before touching anything — in particular, this does **not** write to `src/lib/data-sources.ts`, does not support multiple repo-map configs, and does not add live progress streaming.

---

### Task 1: Extract `scanRepos`/`recordScanManifest` from the CLI into a shared module

**Files:**
- Create: `scripts/okf-scan/scan-repos.ts`
- Modify: `scripts/okf-scan/index.ts`
- Test: `scripts/okf-scan/scan-repos.test.ts`

This is a pure extraction — `main()`'s freshness-check/scan orchestration (today only reachable via the CLI) becomes a function the new API route handlers can call directly too. No behavior changes; the existing `scripts/okf-scan/index.test.ts` (which only tests `parseArgs`) is unaffected.

- [ ] **Step 1: Write the failing tests**

Create `scripts/okf-scan/scan-repos.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RepoMapConfig, ScanManifest } from "./types";

vi.mock("./check-repo-freshness", () => ({
  checkRepoFreshness: vi.fn(),
}));
vi.mock("./terraform/scan-terraform", () => ({
  scanTerraform: vi.fn(),
}));
vi.mock("./code/scan-lambda-repo", () => ({
  scanLambdaRepo: vi.fn(),
}));
vi.mock("./code/scan-frontend-repo", () => ({
  scanFrontendRepo: vi.fn(),
}));
vi.mock("./git/worktree", () => ({
  syncWorktree: vi.fn(async (_repoPath: string, repoKey: string) => `/worktrees/${repoKey}`),
}));
vi.mock("./code/codeowners", () => ({
  ownerForFile: vi.fn(async () => undefined),
}));
vi.mock("./manifest", () => ({
  loadManifest: vi.fn(),
  saveManifest: vi.fn(),
}));

const { checkRepoFreshness } = await import("./check-repo-freshness");
const { scanTerraform } = await import("./terraform/scan-terraform");
const { scanLambdaRepo } = await import("./code/scan-lambda-repo");
const { scanFrontendRepo } = await import("./code/scan-frontend-repo");
const { syncWorktree } = await import("./git/worktree");
const { loadManifest, saveManifest } = await import("./manifest");
const { scanRepos, recordScanManifest } = await import("./scan-repos");

const config: RepoMapConfig = {
  terraform: { path: "../infra", envFiles: { dev: "dev.tf", hml: "hml.tf", prd: "prd.tf" } },
  resources: {
    "aws_lambda_function.orders": { repo: "../orders-service", branch: { dev: "develop", hml: "staging", prd: "main" } },
  },
  frontend: [{ repo: "../web-storefront", branch: { dev: "develop", hml: "staging", prd: "main" } }],
};

function manifestWith(overrides: Partial<ScanManifest> = {}): ScanManifest {
  return { _repos: {}, concepts: {}, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("scanRepos", () => {
  it("reuses cached concepts for unchanged repos and only scans what changed", async () => {
    vi.mocked(loadManifest).mockResolvedValue(
      manifestWith({
        concepts: {
          platformChild: {
            inputHash: "h1",
            lastScannedAt: "t",
            facts: { id: "platform-child", type: "X", level: "container", parentId: "platform", sourceFiles: [] },
          },
          storefrontCached: {
            inputHash: "h2",
            lastScannedAt: "t",
            facts: { id: "web-storefront/cached", type: "X", level: "container", parentId: "web-storefront", sourceFiles: [] },
          },
        },
      }),
    );
    vi.mocked(checkRepoFreshness).mockResolvedValue([
      { ref: { key: "terraform", kind: "terraform", repoPath: "../infra" }, currentRef: "tf-1", changed: false },
      {
        ref: { key: "aws_lambda_function.orders", kind: "lambda", repoPath: "../orders-service", branch: "develop" },
        currentRef: "lambda-1",
        changed: true,
      },
      {
        ref: { key: "web-storefront", kind: "frontend", repoPath: "../web-storefront", branch: "develop" },
        currentRef: "fe-1",
        changed: false,
      },
    ]);
    vi.mocked(scanLambdaRepo).mockResolvedValue([
      { id: "orders", type: "AWS Lambda Function", level: "container", parentId: "platform", sourceFiles: ["handler.ts"] },
    ]);

    const { scanResult, freshness } = await scanRepos(config, "dev", "public/okf-bundles/test", false, 20, 4);

    expect(scanTerraform).not.toHaveBeenCalled();
    expect(syncWorktree).toHaveBeenCalledWith("../orders-service", "aws_lambda_function.orders", "develop", "dev");
    expect(scanFrontendRepo).not.toHaveBeenCalled();
    expect(scanResult.concepts.map((c) => c.id).sort()).toEqual(["orders", "platform-child", "web-storefront/cached"]);
    expect(freshness).toHaveLength(3);
  });

  it("force=true bypasses the manifest cache and rescans everything, including an unchanged terraform repo", async () => {
    vi.mocked(checkRepoFreshness).mockResolvedValue([
      { ref: { key: "terraform", kind: "terraform", repoPath: "../infra" }, currentRef: "tf-1", changed: false },
    ]);
    vi.mocked(scanTerraform).mockResolvedValue({ concepts: [], groups: [], lambdaEnvVarBindings: {} });

    await scanRepos({ terraform: config.terraform }, "dev", "public/okf-bundles/test", true, 20, 4);

    expect(loadManifest).not.toHaveBeenCalled();
    expect(scanTerraform).toHaveBeenCalledWith(config.terraform, "dev");
  });
});

describe("recordScanManifest", () => {
  it("reloads the manifest fresh and records freshness + lambdaEnvVarBindings", async () => {
    vi.mocked(loadManifest).mockResolvedValue(
      manifestWith({
        concepts: {
          existing: { inputHash: "h", lastScannedAt: "t", facts: { id: "existing", type: "X", level: "container", parentId: null, sourceFiles: [] } },
        },
      }),
    );

    await recordScanManifest(
      "public/okf-bundles/test",
      [{ ref: { key: "web-storefront", kind: "frontend", repoPath: "../web-storefront" }, currentRef: "fe-2", changed: true }],
      "dev",
      { orders: { ORDERS_TABLE: "aws_dynamodb_table.orders" } },
    );

    expect(saveManifest).toHaveBeenCalledWith(
      "public/okf-bundles/test",
      expect.objectContaining({
        _repos: { "web-storefront": { lastScannedRef: "fe-2", env: "dev" } },
        lambdaEnvVarBindings: { orders: { ORDERS_TABLE: "aws_dynamodb_table.orders" } },
        concepts: expect.objectContaining({ existing: expect.anything() }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/okf-scan/scan-repos.test.ts`
Expected: FAIL — `Failed to resolve import "./scan-repos"` (module doesn't exist yet).

- [ ] **Step 3: Create `scripts/okf-scan/scan-repos.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/okf-scan/scan-repos.test.ts`
Expected: PASS (2 tests in `scanRepos`, 1 in `recordScanManifest`)

- [ ] **Step 5: Refactor `index.ts` to use the extracted functions**

In `scripts/okf-scan/index.ts`, replace the entire file with:

```ts
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
```

- [ ] **Step 6: Run the full okf-scan test suite to verify nothing broke**

Run: `npx vitest run scripts/okf-scan`
Expected: PASS — every existing test (`index.test.ts`'s `parseArgs` tests, `e2e.test.ts`, etc.) still passes unmodified, plus the 3 new `scan-repos.test.ts` tests.

- [ ] **Step 7: Commit**

```bash
git add scripts/okf-scan/scan-repos.ts scripts/okf-scan/scan-repos.test.ts scripts/okf-scan/index.ts
git commit -m "$(cat <<'EOF'
refactor(okf-scan): extract scanRepos/recordScanManifest for reuse

Pulls main()'s freshness-check/scan orchestration into a standalone
module so the upcoming pipeline API route handlers can call the same
logic the CLI uses, instead of duplicating it.
EOF
)"
```

---

### Task 2: `repo-map.ts` — exportable schema + `saveRepoMap`

**Files:**
- Modify: `scripts/okf-scan/repo-map.ts`
- Test: `scripts/okf-scan/repo-map.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `scripts/okf-scan/repo-map.test.ts` (new imports at the top, new `describe` block at the bottom):

```ts
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadRepoMap, saveRepoMap } from "./repo-map";
import type { RepoMapConfig } from "./types";

const FIXTURE = path.join(__dirname, "__fixtures__", "repo-map.example.yaml");

// ... existing describe("loadRepoMap", ...) block stays unchanged ...

describe("saveRepoMap", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "repo-map-save-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips a valid config through YAML", async () => {
    const file = path.join(dir, "repo-map.yaml");
    const config: RepoMapConfig = {
      frontend: [{ repo: "../web-storefront", branch: { dev: "develop", hml: "staging", prd: "main" } }],
    };
    await saveRepoMap(file, config);
    const loaded = await loadRepoMap(file);
    expect(loaded).toEqual(config);
  });

  it("rejects an invalid config without writing anything", async () => {
    const file = path.join(dir, "repo-map.yaml");
    await expect(saveRepoMap(file, {} as RepoMapConfig)).rejects.toThrow(/at least one/i);
    await expect(access(file)).rejects.toThrow();
  });
});
```

(Note: `path` and `describe`/`it`/`expect` are already imported at the top of the existing file — just add the `access`, `mkdtemp`, `rm`, `tmpdir`, `afterEach`, `beforeEach`, `saveRepoMap`, and `RepoMapConfig` imports alongside the existing ones, and append the new `describe` block after the existing `describe("loadRepoMap", ...)`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/okf-scan/repo-map.test.ts`
Expected: FAIL — `saveRepoMap` is not exported from `./repo-map`.

- [ ] **Step 3: Update `scripts/okf-scan/repo-map.ts`**

Replace the file's contents with:

```ts
import { readFile, writeFile } from "node:fs/promises";
import { parse, stringify } from "yaml";
import { z } from "zod";
import type { RepoMapConfig } from "./types";

const BranchMapSchema = z.object({
  dev: z.string().min(1),
  hml: z.string().min(1),
  prd: z.string().min(1),
});

export const RepoMapSchema = z
  .object({
    terraform: z
      .object({
        path: z.string().min(1),
        envFiles: BranchMapSchema,
      })
      .optional(),
    resources: z
      .record(
        z.string(),
        z.object({
          repo: z.string().min(1),
          branch: BranchMapSchema,
        })
      )
      .optional(),
    frontend: z
      .array(
        z.object({
          repo: z.string().min(1),
          branch: BranchMapSchema,
        })
      )
      .optional(),
  })
  .refine((data) => data.terraform !== undefined || data.resources !== undefined || data.frontend !== undefined, {
    message: "repo-map.yaml must define at least one of: terraform, resources, frontend",
  });

/**
 * Validates an already-decoded value against the repo-map schema, throwing a
 * message that names `sourceLabel` (the file path, for both `loadRepoMap`'s
 * read and `saveRepoMap`'s pre-write check) so a caller sees exactly which
 * file/save attempt was invalid.
 */
export function validateRepoMapConfig(parsed: unknown, sourceLabel: string): RepoMapConfig {
  const result = RepoMapSchema.safeParse(parsed);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
    throw new Error(`Invalid repo-map.yaml at ${sourceLabel}:\n- ${messages.join("\n- ")}`);
  }
  return result.data;
}

export async function loadRepoMap(filePath: string): Promise<RepoMapConfig> {
  const raw = await readFile(filePath, "utf-8");
  const parsed = parse(raw);
  return validateRepoMapConfig(parsed, filePath);
}

/** Validates `config` before writing, so a malformed edit from the pipeline UI never overwrites a previously-valid repo-map.yaml on disk. */
export async function saveRepoMap(filePath: string, config: RepoMapConfig): Promise<void> {
  const validated = validateRepoMapConfig(config, filePath);
  await writeFile(filePath, stringify(validated), "utf-8");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/okf-scan/repo-map.test.ts`
Expected: PASS — all existing `loadRepoMap` tests plus the 2 new `saveRepoMap` tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/repo-map.ts scripts/okf-scan/repo-map.test.ts
git commit -m "$(cat <<'EOF'
feat(okf-scan): add saveRepoMap and export RepoMapSchema

Needed by the pipeline UI's repo-map editor to validate and persist
edits — validation now runs through one shared function used by both
load and save, so a malformed edit is rejected before it ever reaches
disk.
EOF
)"
```

---

### Task 3: `@okf-scan/*` path alias + server-external packages

**Files:**
- Modify: `tsconfig.json`
- Modify: `vitest.config.ts`
- Modify: `next.config.ts`

Route handlers and pipeline components need to import from `scripts/okf-scan/**`. Without an alias, every one of the 5 route handlers and several components would need a fragile `../../../../../scripts/okf-scan/...` relative path. This mirrors the existing `@/*` → `./src/*` convention.

Some `scripts/okf-scan/**` dependencies (`simple-git` spawns the `git` binary; `@cdktf/hcl2json` wraps a native parser) do Node-specific things that Next.js's server bundler can mishandle if it tries to bundle them — `serverExternalPackages` opts them out of bundling in favor of native `require`, the same mechanism Next.js documents for exactly this situation.

- [ ] **Step 1: Add the path alias to `tsconfig.json`**

In `tsconfig.json`, change:

```json
    "paths": {
      "@/*": ["./src/*"]
    }
```

to:

```json
    "paths": {
      "@/*": ["./src/*"],
      "@okf-scan/*": ["./scripts/okf-scan/*"]
    }
```

- [ ] **Step 2: Add the same alias to `vitest.config.ts`**

Vitest doesn't read `tsconfig.json`'s `paths` on its own (see the existing comment above the `@` alias) — mirror the same mapping there. Change:

```ts
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
```

to:

```ts
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@okf-scan": fileURLToPath(new URL("./scripts/okf-scan", import.meta.url)),
    },
```

- [ ] **Step 3: Mark Node-native pipeline dependencies external in `next.config.ts`**

Change:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

to:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // scripts/okf-scan/** (used by the /pipeline API routes) depends on these
  // for real Node-native work — simple-git spawns the `git` binary,
  // @cdktf/hcl2json wraps a native HCL parser, @anthropic-ai/sdk does Node
  // HTTP/streaming — bundling them can break in ways native `require` doesn't.
  serverExternalPackages: ["simple-git", "@cdktf/hcl2json", "@anthropic-ai/sdk"],
};

export default nextConfig;
```

- [ ] **Step 4: Verify nothing broke**

Run: `npx tsc --noEmit -p .`
Expected: PASS (no errors — nothing imports the new alias yet, this just confirms the config edits themselves are syntactically valid).

Run: `npx vitest run`
Expected: PASS (full existing suite, unaffected).

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json vitest.config.ts next.config.ts
git commit -m "$(cat <<'EOF'
chore(pipeline): add @okf-scan/* path alias and server-external packages

Prep for the /pipeline API routes, which need to import scripts/okf-scan
modules cleanly and must not have simple-git/@cdktf/hcl2json/@anthropic-ai/sdk
bundled by Next's server compiler.
EOF
)"
```

---

### Task 4: Shared API request-parsing/error helpers

**Files:**
- Create: `src/lib/pipeline/api-helpers.ts`
- Test: `src/lib/pipeline/api-helpers.test.ts`

Every scan/materialize route handler shares the same request body shape (`repoMap`, `env`, `out`, `force`, 3 concurrency flags) and the same error-response shape — pulled into one module so the 4 route handlers that need it (scan, materialize/propose, materialize/apply) don't duplicate validation.

- [ ] **Step 1: Write the failing test**

Create `src/lib/pipeline/api-helpers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseScanRequest } from "./api-helpers";

describe("parseScanRequest", () => {
  const repoMap = { frontend: [{ repo: "../web-storefront", branch: { dev: "develop", hml: "staging", prd: "main" } }] };

  it("applies concurrency defaults when omitted", () => {
    const fields = parseScanRequest({ repoMap, env: "dev", out: "public/okf-bundles/test" });
    expect(fields).toEqual({
      repoMap,
      env: "dev",
      out: "public/okf-bundles/test",
      force: false,
      concurrencyGit: 20,
      concurrencyScan: 4,
      concurrencyLlm: 6,
    });
  });

  it("rejects a missing repoMap", () => {
    expect(() => parseScanRequest({ env: "dev", out: "out" })).toThrow(/repoMap/);
  });

  it("rejects an invalid env", () => {
    expect(() => parseScanRequest({ repoMap, env: "staging", out: "out" })).toThrow(/dev, hml, prd/);
  });

  it("rejects a missing out", () => {
    expect(() => parseScanRequest({ repoMap, env: "dev" })).toThrow(/out/);
  });

  it("passes through force and overridden concurrency", () => {
    const fields = parseScanRequest({ repoMap, env: "prd", out: "out", force: true, concurrencyGit: 5 });
    expect(fields.force).toBe(true);
    expect(fields.concurrencyGit).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pipeline/api-helpers.test.ts`
Expected: FAIL — module `./api-helpers` doesn't exist.

- [ ] **Step 3: Create `src/lib/pipeline/api-helpers.ts`**

```ts
import { NextResponse } from "next/server";
import type { Environment, RepoMapConfig } from "@okf-scan/types";

export interface ScanRequestFields {
  repoMap: RepoMapConfig;
  env: Environment;
  out: string;
  force: boolean;
  concurrencyGit: number;
  concurrencyScan: number;
  concurrencyLlm: number;
}

/**
 * Parses and validates the fields every pipeline scan/materialize route
 * shares, throwing a plain Error with a message safe to show directly in the
 * wizard UI on anything missing or malformed.
 */
export function parseScanRequest(body: unknown): ScanRequestFields {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!b.repoMap || typeof b.repoMap !== "object") throw new Error("Missing required field: repoMap");
  if (b.env !== "dev" && b.env !== "hml" && b.env !== "prd") {
    throw new Error(`env must be one of dev, hml, prd (got "${String(b.env)}")`);
  }
  if (typeof b.out !== "string" || b.out.length === 0) throw new Error("Missing required field: out");
  return {
    repoMap: b.repoMap as RepoMapConfig,
    env: b.env,
    out: b.out,
    force: Boolean(b.force),
    concurrencyGit: typeof b.concurrencyGit === "number" ? b.concurrencyGit : 20,
    concurrencyScan: typeof b.concurrencyScan === "number" ? b.concurrencyScan : 4,
    concurrencyLlm: typeof b.concurrencyLlm === "number" ? b.concurrencyLlm : 6,
  };
}

/** Every pipeline route handler catches its own errors and returns this shape, so the wizard can render the message inline instead of a generic failure. */
export function errorResponse(err: unknown, status = 500) {
  return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pipeline/api-helpers.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline/api-helpers.ts src/lib/pipeline/api-helpers.test.ts
git commit -m "feat(pipeline): add shared API request-parsing/error helpers"
```

---

### Task 5: `dataSourceSnippet` helper

**Files:**
- Create: `src/lib/pipeline/data-source-snippet.ts`
- Test: `src/lib/pipeline/data-source-snippet.test.ts`

Reproduces the exact `DATA_SOURCES` entry string `index.ts`'s `main()` already prints, so the wizard's final step can show the same copy-paste snippet without a server round-trip (it only depends on `out`).

- [ ] **Step 1: Write the failing test**

Create `src/lib/pipeline/data-source-snippet.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dataSourceSnippet } from "./data-source-snippet";

describe("dataSourceSnippet", () => {
  it("derives the id from the last path segment", () => {
    const snippet = dataSourceSnippet("public/okf-bundles/blog2");
    expect(snippet).toContain('id: "blog2"');
    expect(snippet).toContain('label: "blog2"');
    expect(snippet).toContain('okfBasePath: "/okf-bundles/blog2"');
  });

  it("ignores a trailing slash", () => {
    expect(dataSourceSnippet("public/okf-bundles/blog2/")).toContain('id: "blog2"');
  });

  it("handles a Windows-style backslash path", () => {
    expect(dataSourceSnippet("public\\okf-bundles\\blog2")).toContain('id: "blog2"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pipeline/data-source-snippet.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `src/lib/pipeline/data-source-snippet.ts`**

```ts
/**
 * Reproduces the exact DATA_SOURCES entry string scripts/okf-scan/index.ts's
 * main() prints at the end of a CLI run, so the wizard can show the same
 * copy-paste snippet — deliberately not written to src/lib/data-sources.ts
 * automatically (see the design spec's "Non-goals").
 */
export function dataSourceSnippet(out: string): string {
  const id = out.split(/[\\/]/).filter(Boolean).pop() ?? out;
  return `{\n  id: "${id}",\n  label: "${id}",\n  load: () => importOkfBundle("/okf-bundles/${id}").then(validateArchModel),\n  okfBasePath: "/okf-bundles/${id}",\n},`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pipeline/data-source-snippet.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline/data-source-snippet.ts src/lib/pipeline/data-source-snippet.test.ts
git commit -m "feat(pipeline): add dataSourceSnippet helper"
```

---

### Task 6: Materialization review reducer

**Files:**
- Create: `src/lib/pipeline/materialize-review.ts`
- Test: `src/lib/pipeline/materialize-review.test.ts`

This is the one genuinely new piece of client-side logic (per the design spec's Testing section): a pure reducer implementing the same accept/rename/merge/drop review model `.claude/skills/okf-scan-humanize/SKILL.md` already describes as a manual JSON edit.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/pipeline/materialize-review.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { MaterializationProposal } from "@okf-scan/synthesize/materialize";
import { applyReviewAction } from "./materialize-review";

function baseProposal(): MaterializationProposal {
  return {
    containerPlans: [
      {
        containerId: "app/shared-ui",
        groups: [
          {
            containerId: "app/shared-ui/layout-navigation",
            memberIds: ["app/shared-ui/header", "app/shared-ui/footer"],
            contextName: "Layout & Navigation",
            promoted: false,
          },
          {
            containerId: "app/shared-ui/contentful-media",
            memberIds: ["app/shared-ui/ctf-image"],
            contextName: "Contentful Media",
            promoted: false,
          },
        ],
        idRemap: {
          "app/shared-ui/header": "app/shared-ui/layout-navigation/header",
          "app/shared-ui/footer": "app/shared-ui/layout-navigation/footer",
          "app/shared-ui/ctf-image": "app/shared-ui/contentful-media/ctf-image",
        },
      },
    ],
    actorProposals: [
      { type: "Person", title: "Visitor", description: "A person browsing the site", relationLabel: "browses" },
    ],
  };
}

describe("applyReviewAction", () => {
  it("renameGroup renames only the targeted group", () => {
    const result = applyReviewAction(baseProposal(), {
      type: "renameGroup",
      containerId: "app/shared-ui",
      groupContainerId: "app/shared-ui/layout-navigation",
      contextName: "Nav & Footer",
    });
    expect(result.containerPlans[0].groups[0].contextName).toBe("Nav & Footer");
    expect(result.containerPlans[0].groups[1].contextName).toBe("Contentful Media");
  });

  it("dropGroup removes the group and its idRemap entries", () => {
    const result = applyReviewAction(baseProposal(), {
      type: "dropGroup",
      containerId: "app/shared-ui",
      groupContainerId: "app/shared-ui/contentful-media",
    });
    expect(result.containerPlans[0].groups.map((g) => g.containerId)).toEqual(["app/shared-ui/layout-navigation"]);
    expect(result.containerPlans[0].idRemap).toEqual({
      "app/shared-ui/header": "app/shared-ui/layout-navigation/header",
      "app/shared-ui/footer": "app/shared-ui/layout-navigation/footer",
    });
  });

  it("mergeGroups folds the 'from' group into the 'into' group and remaps only its members", () => {
    const result = applyReviewAction(baseProposal(), {
      type: "mergeGroups",
      containerId: "app/shared-ui",
      intoGroupContainerId: "app/shared-ui/layout-navigation",
      fromGroupContainerId: "app/shared-ui/contentful-media",
    });
    const plan = result.containerPlans[0];
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0].memberIds).toEqual(["app/shared-ui/header", "app/shared-ui/footer", "app/shared-ui/ctf-image"]);
    expect(plan.idRemap["app/shared-ui/ctf-image"]).toBe("app/shared-ui/layout-navigation/ctf-image");
    expect(plan.idRemap["app/shared-ui/header"]).toBe("app/shared-ui/layout-navigation/header");
  });

  it("renameActor and dropActor operate on actorProposals independently of containerPlans", () => {
    const renamed = applyReviewAction(baseProposal(), { type: "renameActor", index: 0, title: "Site Visitor" });
    expect(renamed.actorProposals[0].title).toBe("Site Visitor");
    expect(renamed.containerPlans).toEqual(baseProposal().containerPlans);

    const dropped = applyReviewAction(baseProposal(), { type: "dropActor", index: 0 });
    expect(dropped.actorProposals).toEqual([]);
  });

  it("only affects the targeted container plan when multiple plans exist", () => {
    const proposal: MaterializationProposal = {
      ...baseProposal(),
      containerPlans: [
        ...baseProposal().containerPlans,
        {
          containerId: "app/other",
          groups: [{ containerId: "app/other/g1", memberIds: ["app/other/x"], contextName: "G1", promoted: false }],
          idRemap: { "app/other/x": "app/other/g1/x" },
        },
      ],
    };
    const result = applyReviewAction(proposal, {
      type: "dropGroup",
      containerId: "app/shared-ui",
      groupContainerId: "app/shared-ui/contentful-media",
    });
    expect(result.containerPlans[1]).toEqual(proposal.containerPlans[1]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/pipeline/materialize-review.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `src/lib/pipeline/materialize-review.ts`**

```ts
import type { CapabilityGroup, MaterializationProposal } from "@okf-scan/synthesize/materialize";

export type MaterializeReviewAction =
  | { type: "renameGroup"; containerId: string; groupContainerId: string; contextName: string }
  | { type: "mergeGroups"; containerId: string; intoGroupContainerId: string; fromGroupContainerId: string }
  | { type: "dropGroup"; containerId: string; groupContainerId: string }
  | { type: "renameActor"; index: number; title: string }
  | { type: "dropActor"; index: number };

/**
 * Pure edit step over a MaterializationProposal, mirroring the review model
 * `.claude/skills/okf-scan-humanize/SKILL.md` already documents as a manual
 * JSON edit: accept (no action needed), rename, merge two groups, or drop an
 * item. Nothing here touches disk — the caller sends the final edited
 * proposal to POST /api/pipeline/materialize/apply once the user is done.
 */
export function applyReviewAction(
  proposal: MaterializationProposal,
  action: MaterializeReviewAction,
): MaterializationProposal {
  switch (action.type) {
    case "renameGroup":
      return {
        ...proposal,
        containerPlans: proposal.containerPlans.map((plan) =>
          plan.containerId !== action.containerId
            ? plan
            : {
                ...plan,
                groups: plan.groups.map((g) =>
                  g.containerId === action.groupContainerId ? { ...g, contextName: action.contextName } : g,
                ),
              },
        ),
      };

    case "dropGroup":
      return {
        ...proposal,
        containerPlans: proposal.containerPlans.map((plan) => {
          if (plan.containerId !== action.containerId) return plan;
          const dropped = plan.groups.find((g) => g.containerId === action.groupContainerId);
          if (!dropped) return plan;
          const idRemap = { ...plan.idRemap };
          for (const memberId of dropped.memberIds) delete idRemap[memberId];
          return { ...plan, groups: plan.groups.filter((g) => g.containerId !== action.groupContainerId), idRemap };
        }),
      };

    case "mergeGroups":
      return {
        ...proposal,
        containerPlans: proposal.containerPlans.map((plan) => {
          if (plan.containerId !== action.containerId) return plan;
          const into = plan.groups.find((g) => g.containerId === action.intoGroupContainerId);
          const from = plan.groups.find((g) => g.containerId === action.fromGroupContainerId);
          if (!into || !from) return plan;
          const mergedInto: CapabilityGroup = { ...into, memberIds: [...into.memberIds, ...from.memberIds] };
          const idRemap = { ...plan.idRemap };
          for (const memberId of from.memberIds) {
            const leafSegment = memberId.split("/").pop()!;
            idRemap[memberId] = `${into.containerId}/${leafSegment}`;
          }
          return {
            ...plan,
            groups: plan.groups
              .filter((g) => g.containerId !== action.fromGroupContainerId && g.containerId !== action.intoGroupContainerId)
              .concat(mergedInto),
            idRemap,
          };
        }),
      };

    case "renameActor":
      return {
        ...proposal,
        actorProposals: proposal.actorProposals.map((a, i) => (i === action.index ? { ...a, title: action.title } : a)),
      };

    case "dropActor":
      return {
        ...proposal,
        actorProposals: proposal.actorProposals.filter((_, i) => i !== action.index),
      };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/pipeline/materialize-review.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline/materialize-review.ts src/lib/pipeline/materialize-review.test.ts
git commit -m "feat(pipeline): add materialization proposal review reducer"
```

---

### Task 7: Route handler — `repo-map`

**Files:**
- Create: `src/app/api/pipeline/repo-map/route.ts`

No automated test for this file (thin wrapper over already-tested `loadRepoMap`/`saveRepoMap`) — verified manually in Task 18.

- [ ] **Step 1: Create the route handler**

```ts
import path from "node:path";
import { NextResponse } from "next/server";
import { loadRepoMap, saveRepoMap } from "@okf-scan/repo-map";
import { errorResponse } from "@/lib/pipeline/api-helpers";

const REPO_MAP_PATH = path.join(process.cwd(), "repo-map.yaml");

export async function GET() {
  try {
    const config = await loadRepoMap(REPO_MAP_PATH);
    return NextResponse.json({ config });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ config: null });
    }
    return errorResponse(err, 400);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await saveRepoMap(REPO_MAP_PATH, body.config);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, 400);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/pipeline/repo-map/route.ts
git commit -m "feat(pipeline): add GET/PUT /api/pipeline/repo-map route"
```

---

### Task 8: Route handler — `scan`

**Files:**
- Create: `src/app/api/pipeline/scan/route.ts`

- [ ] **Step 1: Create the route handler**

```ts
import { NextResponse } from "next/server";
import { errorResponse, parseScanRequest } from "@/lib/pipeline/api-helpers";
import { recordScanManifest, scanRepos } from "@okf-scan/scan-repos";
import { createAnthropicLlmClient } from "@okf-scan/synthesize/llm";
import { createAnthropicOrganizerClient } from "@okf-scan/synthesize/organize";
import { synthesize } from "@okf-scan/synthesize/synthesize";

export async function POST(request: Request) {
  try {
    const fields = parseScanRequest(await request.json());
    const { scanResult, freshness } = await scanRepos(
      fields.repoMap,
      fields.env,
      fields.out,
      fields.force,
      fields.concurrencyGit,
      fields.concurrencyScan,
    );
    const summary = await synthesize({
      scanResult,
      bundleDir: fields.out,
      llm: createAnthropicLlmClient(),
      organizer: createAnthropicOrganizerClient(),
      force: fields.force,
      concurrency: fields.concurrencyLlm,
    });
    await recordScanManifest(fields.out, freshness, fields.env, scanResult.lambdaEnvVarBindings);
    return NextResponse.json({ summary });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/pipeline/scan/route.ts
git commit -m "feat(pipeline): add POST /api/pipeline/scan route"
```

---

### Task 9: Route handler — `materialize/propose`

**Files:**
- Create: `src/app/api/pipeline/materialize/propose/route.ts`

- [ ] **Step 1: Create the route handler**

```ts
import { NextResponse } from "next/server";
import { errorResponse, parseScanRequest } from "@/lib/pipeline/api-helpers";
import { loadManifest } from "@okf-scan/manifest";
import { scanRepos } from "@okf-scan/scan-repos";
import { createAnthropicActorInferenceClient } from "@okf-scan/synthesize/actors";
import { proposeMaterialization, writeProposal } from "@okf-scan/synthesize/materialize";
import { createAnthropicOrganizerClient } from "@okf-scan/synthesize/organize";
import { emptyManifest } from "@okf-scan/types";

export async function POST(request: Request) {
  try {
    const fields = parseScanRequest(await request.json());
    const { scanResult } = await scanRepos(
      fields.repoMap,
      fields.env,
      fields.out,
      fields.force,
      fields.concurrencyGit,
      fields.concurrencyScan,
    );
    const manifestForSkip = fields.force ? emptyManifest() : await loadManifest(fields.out);
    const alreadyMaterialized = new Set(Object.keys(manifestForSkip.materializedContainers ?? {}));
    const proposal = await proposeMaterialization(
      scanResult,
      createAnthropicOrganizerClient(),
      createAnthropicActorInferenceClient(),
      alreadyMaterialized,
    );
    await writeProposal(fields.out, proposal);
    return NextResponse.json({ proposal });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/pipeline/materialize/propose/route.ts
git commit -m "feat(pipeline): add POST /api/pipeline/materialize/propose route"
```

---

### Task 10: Route handler — `materialize/apply`

**Files:**
- Create: `src/app/api/pipeline/materialize/apply/route.ts`

- [ ] **Step 1: Create the route handler**

```ts
import { NextResponse } from "next/server";
import { errorResponse, parseScanRequest } from "@/lib/pipeline/api-helpers";
import { recordScanManifest, scanRepos } from "@okf-scan/scan-repos";
import { applyMaterializationProposal, writeProposal, type MaterializationProposal } from "@okf-scan/synthesize/materialize";
import { createAnthropicLlmClient } from "@okf-scan/synthesize/llm";
import { createAnthropicOrganizerClient } from "@okf-scan/synthesize/organize";
import { synthesize } from "@okf-scan/synthesize/synthesize";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fields = parseScanRequest(body);
    const proposal = body.proposal as MaterializationProposal | undefined;
    if (!proposal) throw new Error("Missing required field: proposal");

    // Write first, so the on-disk plan matches what's actually applied below —
    // same as a human hand-editing .materialize-proposal.json before running
    // `--materialize apply` today.
    await writeProposal(fields.out, proposal);

    const { scanResult, freshness } = await scanRepos(
      fields.repoMap,
      fields.env,
      fields.out,
      fields.force,
      fields.concurrencyGit,
      fields.concurrencyScan,
    );
    const applied = applyMaterializationProposal(scanResult, proposal);
    const newlyMaterializedContainerIds = proposal.containerPlans.map((p) => p.containerId);

    const summary = await synthesize({
      scanResult: applied,
      bundleDir: fields.out,
      llm: createAnthropicLlmClient(),
      organizer: createAnthropicOrganizerClient(),
      force: fields.force,
      concurrency: fields.concurrencyLlm,
      newlyMaterializedContainerIds,
    });
    await recordScanManifest(fields.out, freshness, fields.env, scanResult.lambdaEnvVarBindings);
    return NextResponse.json({ summary });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/pipeline/materialize/apply/route.ts
git commit -m "feat(pipeline): add POST /api/pipeline/materialize/apply route"
```

---

### Task 11: Route handler — `validate`

**Files:**
- Create: `src/app/api/pipeline/validate/route.ts`

- [ ] **Step 1: Create the route handler**

```ts
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { importOkfBundle, type OkfIo } from "@/lib/okf-import";
import { validateArchModel } from "@/lib/validate-model";

// Mirrors scripts/validate-model.ts's fsIo: importOkfBundle treats basePath as
// rooted at "/", the same convention the browser's fetch("/okf-bundles/...")
// uses — so this maps that logical root onto the filesystem's public/ dir.
const PUBLIC_DIR = path.join(process.cwd(), "public");
const fsIo: OkfIo = {
  readText: (p) => readFile(path.join(PUBLIC_DIR, p), "utf-8"),
  exists: (p) =>
    access(path.join(PUBLIC_DIR, p))
      .then(() => true)
      .catch(() => false),
};

function toLogicalBundlePath(out: string): string {
  const relative = path.relative(PUBLIC_DIR, path.resolve(out));
  if (relative.startsWith("..")) {
    throw new Error(`"out" must be a path under public/ (got "${out}")`);
  }
  return `/${relative.replace(/\\/g, "/")}`;
}

export async function POST(request: Request) {
  try {
    const { out } = (await request.json()) as { out?: string };
    if (!out) throw new Error("Missing required field: out");
    const basePath = toLogicalBundlePath(out);
    await importOkfBundle(basePath, fsIo).then(validateArchModel);
    return NextResponse.json({ valid: true });
  } catch (err) {
    return NextResponse.json({ valid: false, error: err instanceof Error ? err.message : String(err) });
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/pipeline/validate/route.ts
git commit -m "feat(pipeline): add POST /api/pipeline/validate route"
```

---

### Task 12: Pipeline page shell + wizard state machine

**Files:**
- Create: `src/app/pipeline/page.tsx`
- Create: `src/components/pipeline/PipelineWizard.tsx`

No automated test (React component, per this repo's existing convention — manual browser verification in Task 18).

- [ ] **Step 1: Create `src/app/pipeline/page.tsx`**

```tsx
import PipelineWizard from "@/components/pipeline/PipelineWizard";

export default function Page() {
  return <PipelineWizard />;
}
```

- [ ] **Step 2: Create `src/components/pipeline/PipelineWizard.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { RepoMapConfig } from "@okf-scan/types";
import type { MaterializationProposal } from "@okf-scan/synthesize/materialize";
import type { SynthesizeSummary } from "@okf-scan/synthesize/synthesize";
import RepoMapEditor from "./RepoMapEditor";
import RunForm, { type RunFields } from "./RunForm";
import ScanResultsSummary from "./ScanResultsSummary";
import MaterializeReview from "./MaterializeReview";
import ValidateAndSnippet from "./ValidateAndSnippet";

type WizardStep = "repo-map" | "run" | "results" | "materialize-review" | "validate";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "repo-map", label: "1. Repo Map" },
  { id: "run", label: "2. Run" },
  { id: "results", label: "3. Results" },
  { id: "materialize-review", label: "4. Materialize" },
  { id: "validate", label: "5. Validate" },
];

export default function PipelineWizard() {
  const [step, setStep] = useState<WizardStep>("repo-map");
  const [repoMap, setRepoMap] = useState<RepoMapConfig | null>(null);
  const [runFields, setRunFields] = useState<RunFields | null>(null);
  const [summary, setSummary] = useState<SynthesizeSummary | null>(null);
  const [proposal, setProposal] = useState<MaterializationProposal | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="pipeline-page">
      <h1>OKF Pipeline</h1>
      <ol className="pipeline-steps">
        {STEPS.map((s) => (
          <li key={s.id} className={s.id === step ? "pipeline-step pipeline-step--active" : "pipeline-step"}>
            {s.label}
          </li>
        ))}
      </ol>
      {error && <div className="pipeline-error">{error}</div>}

      {step === "repo-map" && (
        <RepoMapEditor
          onSaved={(config) => {
            setRepoMap(config);
            setError(null);
            setStep("run");
          }}
          onError={setError}
        />
      )}

      {step === "run" && repoMap && (
        <RunForm
          repoMap={repoMap}
          onBack={() => setStep("repo-map")}
          onResult={(fields, result) => {
            setRunFields(fields);
            setSummary(result);
            setError(null);
            setStep("results");
          }}
          onError={setError}
        />
      )}

      {step === "results" && summary && (
        <ScanResultsSummary
          summary={summary}
          onProposeMaterialize={() => setStep("materialize-review")}
          onSkipToValidate={() => setStep("validate")}
          onBack={() => setStep("run")}
        />
      )}

      {step === "materialize-review" && repoMap && runFields && (
        <MaterializeReview
          repoMap={repoMap}
          runFields={runFields}
          proposal={proposal}
          onProposalLoaded={setProposal}
          onApplied={(result) => {
            setSummary(result);
            setError(null);
            setStep("validate");
          }}
          onSkip={() => setStep("validate")}
          onError={setError}
        />
      )}

      {step === "validate" && runFields && <ValidateAndSnippet runFields={runFields} onBack={() => setStep("results")} />}
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: FAIL — `RepoMapEditor`, `RunForm`, `ScanResultsSummary`, `MaterializeReview`, `ValidateAndSnippet` don't exist yet. This is expected; they're created in the next 4 tasks. Do not commit yet.

- [ ] **Step 4: Commit** (after Tasks 13–16 make this compile)

Hold this commit until Task 16 is done — see Task 16's Step 3, which commits this file together with the last of the child components.

---

### Task 13: `RepoMapEditor` component

**Files:**
- Create: `src/components/pipeline/RepoMapEditor.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { RepoMapConfig } from "@okf-scan/types";

interface BranchFields {
  dev: string;
  hml: string;
  prd: string;
}

interface ResourceRow {
  key: string;
  repo: string;
  branch: BranchFields;
}

interface FrontendRow {
  repo: string;
  branch: BranchFields;
}

interface FormState {
  terraformEnabled: boolean;
  terraformPath: string;
  terraformEnvFiles: BranchFields;
  resources: ResourceRow[];
  frontend: FrontendRow[];
}

const EMPTY_BRANCH: BranchFields = { dev: "", hml: "", prd: "" };

const EMPTY_FORM: FormState = {
  terraformEnabled: false,
  terraformPath: "",
  terraformEnvFiles: { dev: "", hml: "", prd: "" },
  resources: [],
  frontend: [],
};

function configToForm(config: RepoMapConfig): FormState {
  return {
    terraformEnabled: Boolean(config.terraform),
    terraformPath: config.terraform?.path ?? "",
    terraformEnvFiles: config.terraform?.envFiles ?? { dev: "", hml: "", prd: "" },
    resources: Object.entries(config.resources ?? {}).map(([key, entry]) => ({ key, repo: entry.repo, branch: entry.branch })),
    frontend: (config.frontend ?? []).map((entry) => ({ repo: entry.repo, branch: entry.branch })),
  };
}

function formToConfig(form: FormState): RepoMapConfig {
  const config: RepoMapConfig = {};
  if (form.terraformEnabled) {
    config.terraform = { path: form.terraformPath, envFiles: form.terraformEnvFiles };
  }
  if (form.resources.length > 0) {
    config.resources = Object.fromEntries(form.resources.map((r) => [r.key, { repo: r.repo, branch: r.branch }]));
  }
  if (form.frontend.length > 0) {
    config.frontend = form.frontend.map((f) => ({ repo: f.repo, branch: f.branch }));
  }
  return config;
}

interface RepoMapEditorProps {
  onSaved: (config: RepoMapConfig) => void;
  onError: (message: string) => void;
}

export default function RepoMapEditor({ onSaved, onError }: RepoMapEditorProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetches once on mount — repo-map.yaml is a single file with no reactive
  // inputs, so there's nothing else this effect needs to depend on.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/pipeline/repo-map")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.config) setForm(configToForm(data.config));
      })
      .catch((err) => onError(err instanceof Error ? err.message : String(err)))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onError]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const config = formToConfig(form);
      const res = await fetch("/api/pipeline/repo-map", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save repo-map.yaml");
      onSaved(config);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function updateResource(index: number, patch: Partial<ResourceRow>) {
    setForm({ ...form, resources: form.resources.map((r, i) => (i === index ? { ...r, ...patch } : r)) });
  }

  function updateFrontend(index: number, patch: Partial<FrontendRow>) {
    setForm({ ...form, frontend: form.frontend.map((f, i) => (i === index ? { ...f, ...patch } : f)) });
  }

  if (loading) return <p className="pipeline-loading">Loading repo-map.yaml…</p>;

  return (
    <form className="pipeline-form" onSubmit={handleSave}>
      <fieldset className="pipeline-fieldset">
        <legend>
          <label>
            <input
              type="checkbox"
              checked={form.terraformEnabled}
              onChange={(e) => setForm({ ...form, terraformEnabled: e.target.checked })}
            />
            Terraform
          </label>
        </legend>
        {form.terraformEnabled && (
          <>
            <label className="pipeline-form-row">
              Path
              <input type="text" value={form.terraformPath} onChange={(e) => setForm({ ...form, terraformPath: e.target.value })} />
            </label>
            {(["dev", "hml", "prd"] as const).map((env) => (
              <label className="pipeline-form-row" key={env}>
                Env file ({env})
                <input
                  type="text"
                  value={form.terraformEnvFiles[env]}
                  onChange={(e) => setForm({ ...form, terraformEnvFiles: { ...form.terraformEnvFiles, [env]: e.target.value } })}
                />
              </label>
            ))}
          </>
        )}
      </fieldset>

      <fieldset className="pipeline-fieldset">
        <legend>Resources (Lambdas)</legend>
        {form.resources.map((row, i) => (
          <div className="pipeline-repo-row" key={i}>
            <input type="text" placeholder="aws_lambda_function.orders" value={row.key} onChange={(e) => updateResource(i, { key: e.target.value })} />
            <input type="text" placeholder="../orders-service" value={row.repo} onChange={(e) => updateResource(i, { repo: e.target.value })} />
            {(["dev", "hml", "prd"] as const).map((env) => (
              <input
                key={env}
                type="text"
                placeholder={env}
                value={row.branch[env]}
                onChange={(e) => updateResource(i, { branch: { ...row.branch, [env]: e.target.value } })}
              />
            ))}
            <button type="button" onClick={() => setForm({ ...form, resources: form.resources.filter((_, idx) => idx !== i) })}>
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setForm({ ...form, resources: [...form.resources, { key: "", repo: "", branch: { ...EMPTY_BRANCH } }] })}
        >
          Add resource
        </button>
      </fieldset>

      <fieldset className="pipeline-fieldset">
        <legend>Frontend</legend>
        {form.frontend.map((row, i) => (
          <div className="pipeline-repo-row" key={i}>
            <input
              type="text"
              placeholder="../template-marketing-webapp-nextjs"
              value={row.repo}
              onChange={(e) => updateFrontend(i, { repo: e.target.value })}
            />
            {(["dev", "hml", "prd"] as const).map((env) => (
              <input
                key={env}
                type="text"
                placeholder={env}
                value={row.branch[env]}
                onChange={(e) => updateFrontend(i, { branch: { ...row.branch, [env]: e.target.value } })}
              />
            ))}
            <button type="button" onClick={() => setForm({ ...form, frontend: form.frontend.filter((_, idx) => idx !== i) })}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setForm({ ...form, frontend: [...form.frontend, { repo: "", branch: { ...EMPTY_BRANCH } }] })}>
          Add frontend repo
        </button>
      </fieldset>

      <div className="pipeline-actions">
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save and continue"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pipeline/RepoMapEditor.tsx
git commit -m "feat(pipeline): add RepoMapEditor component"
```

---

### Task 14: `RunForm` + `ScanResultsSummary` components

**Files:**
- Create: `src/components/pipeline/RunForm.tsx`
- Create: `src/components/pipeline/ScanResultsSummary.tsx`

- [ ] **Step 1: Create `src/components/pipeline/RunForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import type { Environment, RepoMapConfig } from "@okf-scan/types";
import type { SynthesizeSummary } from "@okf-scan/synthesize/synthesize";

export interface RunFields {
  env: Environment;
  out: string;
  force: boolean;
  concurrencyGit: number;
  concurrencyScan: number;
  concurrencyLlm: number;
}

interface RunFormProps {
  repoMap: RepoMapConfig;
  onBack: () => void;
  onResult: (fields: RunFields, summary: SynthesizeSummary) => void;
  onError: (message: string) => void;
}

const DEFAULT_FIELDS: RunFields = {
  env: "dev",
  out: "",
  force: false,
  concurrencyGit: 20,
  concurrencyScan: 4,
  concurrencyLlm: 6,
};

export default function RunForm({ repoMap, onBack, onResult, onError }: RunFormProps) {
  const [fields, setFields] = useState<RunFields>(DEFAULT_FIELDS);
  const [running, setRunning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setRunning(true);
    try {
      const res = await fetch("/api/pipeline/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoMap, ...fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      onResult(fields, data.summary);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <form className="pipeline-form" onSubmit={handleSubmit}>
      <label className="pipeline-form-row">
        Environment
        <select value={fields.env} onChange={(e) => setFields({ ...fields, env: e.target.value as Environment })}>
          <option value="dev">dev</option>
          <option value="hml">hml</option>
          <option value="prd">prd</option>
        </select>
      </label>
      <label className="pipeline-form-row">
        Output bundle directory
        <input
          type="text"
          placeholder="public/okf-bundles/my-bundle"
          value={fields.out}
          onChange={(e) => setFields({ ...fields, out: e.target.value })}
          required
        />
      </label>
      <label className="pipeline-form-row pipeline-form-row--checkbox">
        <input type="checkbox" checked={fields.force} onChange={(e) => setFields({ ...fields, force: e.target.checked })} />
        Force (ignore manifest cache, rescan everything)
      </label>
      <button type="button" className="pipeline-advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
        {showAdvanced ? "Hide" : "Show"} advanced options
      </button>
      {showAdvanced && (
        <>
          <label className="pipeline-form-row">
            Concurrency — git
            <input
              type="number"
              min={1}
              value={fields.concurrencyGit}
              onChange={(e) => setFields({ ...fields, concurrencyGit: Number(e.target.value) })}
            />
          </label>
          <label className="pipeline-form-row">
            Concurrency — scan
            <input
              type="number"
              min={1}
              value={fields.concurrencyScan}
              onChange={(e) => setFields({ ...fields, concurrencyScan: Number(e.target.value) })}
            />
          </label>
          <label className="pipeline-form-row">
            Concurrency — LLM
            <input
              type="number"
              min={1}
              value={fields.concurrencyLlm}
              onChange={(e) => setFields({ ...fields, concurrencyLlm: Number(e.target.value) })}
            />
          </label>
        </>
      )}
      <div className="pipeline-actions">
        <button type="button" onClick={onBack} disabled={running}>
          Back
        </button>
        <button type="submit" disabled={running}>
          {running ? "Running…" : "Run scan"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/components/pipeline/ScanResultsSummary.tsx`**

```tsx
"use client";

import type { SynthesizeSummary } from "@okf-scan/synthesize/synthesize";

interface ScanResultsSummaryProps {
  summary: SynthesizeSummary;
  onProposeMaterialize: () => void;
  onSkipToValidate: () => void;
  onBack: () => void;
}

export default function ScanResultsSummary({ summary, onProposeMaterialize, onSkipToValidate, onBack }: ScanResultsSummaryProps) {
  return (
    <div className="pipeline-summary">
      <p>
        Wrote {summary.written.length}, skipped {summary.skipped.length} concept(s).
      </p>
      {summary.needsReview.length > 0 && (
        <div>
          <h3>{summary.needsReview.length} concept(s) need manual review</h3>
          <ul>
            {summary.needsReview.map((item) => (
              <li key={item.id}>
                <strong>{item.id}</strong>
                <ul>
                  {item.notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
      {summary.failed.length > 0 && (
        <div>
          <h3>{summary.failed.length} concept(s) failed (will retry next run)</h3>
          <ul>
            {summary.failed.map((item) => (
              <li key={item.id}>
                <strong>{item.id}</strong>: {item.error}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="pipeline-actions">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <button type="button" onClick={onProposeMaterialize}>
          Propose materialization
        </button>
        <button type="button" onClick={onSkipToValidate}>
          Skip to validate
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/pipeline/RunForm.tsx src/components/pipeline/ScanResultsSummary.tsx
git commit -m "feat(pipeline): add RunForm and ScanResultsSummary components"
```

---

### Task 15: `MaterializeReview` component

**Files:**
- Create: `src/components/pipeline/MaterializeReview.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { RepoMapConfig } from "@okf-scan/types";
import type { MaterializationProposal } from "@okf-scan/synthesize/materialize";
import type { SynthesizeSummary } from "@okf-scan/synthesize/synthesize";
import { applyReviewAction } from "@/lib/pipeline/materialize-review";
import type { RunFields } from "./RunForm";

interface MaterializeReviewProps {
  repoMap: RepoMapConfig;
  runFields: RunFields;
  proposal: MaterializationProposal | null;
  onProposalLoaded: (proposal: MaterializationProposal) => void;
  onApplied: (summary: SynthesizeSummary) => void;
  onSkip: () => void;
  onError: (message: string) => void;
}

export default function MaterializeReview({
  repoMap,
  runFields,
  proposal,
  onProposalLoaded,
  onApplied,
  onSkip,
  onError,
}: MaterializeReviewProps) {
  const [working, setWorking] = useState<MaterializationProposal | null>(proposal);
  const [loading, setLoading] = useState(proposal === null);
  const [applying, setApplying] = useState(false);

  // Fetches the proposal once, only if the parent hasn't already cached one
  // (e.g. from a previous visit to this step) — see the `[proposal]` dep below.
  useEffect(() => {
    if (proposal !== null) {
      setWorking(proposal);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch("/api/pipeline/materialize/propose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoMap, ...runFields }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        onProposalLoaded(data.proposal);
        setWorking(data.proposal);
      })
      .catch((err) => onError(err instanceof Error ? err.message : String(err)))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal]);

  async function handleApply() {
    if (!working) return;
    setApplying(true);
    try {
      const res = await fetch("/api/pipeline/materialize/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoMap, ...runFields, proposal: working }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Apply failed");
      onApplied(data.summary);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <p className="pipeline-loading">Proposing materialization…</p>;
  if (!working) return null;

  if (working.containerPlans.length === 0 && working.actorProposals.length === 0) {
    return (
      <div className="pipeline-summary">
        <p>No materialization proposed — no container was large enough, and no missing actors were inferred.</p>
        <div className="pipeline-actions">
          <button type="button" onClick={onSkip}>
            Continue to validate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pipeline-materialize-review">
      {working.containerPlans.map((plan) => (
        <div className="pipeline-card" key={plan.containerId}>
          <h3>Splitting {plan.containerId}</h3>
          {plan.groups.map((group) => (
            <div className="pipeline-card-row" key={group.containerId}>
              <input
                type="text"
                value={group.contextName}
                onChange={(e) =>
                  setWorking(
                    applyReviewAction(working, {
                      type: "renameGroup",
                      containerId: plan.containerId,
                      groupContainerId: group.containerId,
                      contextName: e.target.value,
                    }),
                  )
                }
              />
              <span>{group.memberIds.length} member(s)</span>
              {group.promoted && <span className="pipeline-badge">Pulled out because other groups depend on it</span>}
              <select
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  setWorking(
                    applyReviewAction(working, {
                      type: "mergeGroups",
                      containerId: plan.containerId,
                      intoGroupContainerId: group.containerId,
                      fromGroupContainerId: e.target.value,
                    }),
                  );
                  e.target.value = "";
                }}
              >
                <option value="">Merge with…</option>
                {plan.groups
                  .filter((g) => g.containerId !== group.containerId)
                  .map((g) => (
                    <option key={g.containerId} value={g.containerId}>
                      {g.contextName}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setWorking(
                    applyReviewAction(working, {
                      type: "dropGroup",
                      containerId: plan.containerId,
                      groupContainerId: group.containerId,
                    }),
                  )
                }
              >
                Drop
              </button>
            </div>
          ))}
        </div>
      ))}

      {working.actorProposals.map((actor, i) => (
        <div className="pipeline-card" key={i}>
          <h3>{actor.type}</h3>
          <input
            type="text"
            value={actor.title}
            onChange={(e) => setWorking(applyReviewAction(working, { type: "renameActor", index: i, title: e.target.value }))}
          />
          <p>{actor.description}</p>
          <p>Relation: {actor.relationLabel}</p>
          <button type="button" onClick={() => setWorking(applyReviewAction(working, { type: "dropActor", index: i }))}>
            Drop
          </button>
        </div>
      ))}

      <div className="pipeline-actions">
        <button type="button" onClick={onSkip} disabled={applying}>
          Skip (don&apos;t apply)
        </button>
        <button type="button" onClick={handleApply} disabled={applying}>
          {applying ? "Applying…" : "Apply"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pipeline/MaterializeReview.tsx
git commit -m "feat(pipeline): add MaterializeReview component"
```

---

### Task 16: `ValidateAndSnippet` component

**Files:**
- Create: `src/components/pipeline/ValidateAndSnippet.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { dataSourceSnippet } from "@/lib/pipeline/data-source-snippet";
import type { RunFields } from "./RunForm";

interface ValidateAndSnippetProps {
  runFields: RunFields;
  onBack: () => void;
}

export default function ValidateAndSnippet({ runFields, onBack }: ValidateAndSnippetProps) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const snippet = dataSourceSnippet(runFields.out);

  async function handleValidate() {
    setChecking(true);
    setResult(null);
    try {
      const res = await fetch("/api/pipeline/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ out: runFields.out }),
      });
      setResult(await res.json());
    } finally {
      setChecking(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="pipeline-summary">
      <div className="pipeline-actions">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <button type="button" onClick={handleValidate} disabled={checking}>
          {checking ? "Validating…" : "Run validate"}
        </button>
      </div>
      {result && (
        <p className={result.valid ? "pipeline-valid" : "pipeline-error"}>
          {result.valid ? "Bundle is valid." : `Validation failed: ${result.error}`}
        </p>
      )}
      <h3>Add this to DATA_SOURCES in src/lib/data-sources.ts</h3>
      <pre className="pipeline-snippet">{snippet}</pre>
      <button type="button" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy snippet"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify the whole app compiles**

Run: `npx tsc --noEmit -p .`
Expected: PASS — `PipelineWizard.tsx` (Task 12) now resolves all 5 child components.

- [ ] **Step 3: Commit**

```bash
git add src/app/pipeline/page.tsx src/components/pipeline/PipelineWizard.tsx src/components/pipeline/ValidateAndSnippet.tsx
git commit -m "feat(pipeline): add ValidateAndSnippet component and wire up the wizard shell"
```

---

### Task 17: Header link + CSS

**Files:**
- Modify: `src/components/ArchVizApp.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add the header link in `ArchVizApp.tsx`**

Add the import near the top (after the existing `next/navigation` import):

```tsx
import Link from "next/link";
```

Then change:

```tsx
      <header className="app-header">
        <h1>ArchViz</h1>
        <DataSourceSelector sources={DATA_SOURCES} selectedId={sourceId} onSelect={handleSelectSource} />
        <Breadcrumb
```

to:

```tsx
      <header className="app-header">
        <h1>ArchViz</h1>
        <DataSourceSelector sources={DATA_SOURCES} selectedId={sourceId} onSelect={handleSelectSource} />
        <Link href="/pipeline" className="search-trigger pipeline-link">
          Pipeline
        </Link>
        <Breadcrumb
```

- [ ] **Step 2: Append pipeline styles to `src/app/globals.css`**

Add at the end of the file:

```css
.pipeline-link {
  text-decoration: none;
}

.pipeline-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px 64px;
}

.pipeline-steps {
  display: flex;
  gap: 12px;
  list-style: none;
  padding: 0;
  margin: 16px 0 24px;
  flex-wrap: wrap;
}

.pipeline-step {
  font-size: 12px;
  color: #8b96a5;
  padding: 4px 10px;
  border: 1px solid #d8dee6;
  border-radius: 6px;
}

.pipeline-step--active {
  color: #1a2733;
  border-color: #5a6b82;
  font-weight: 600;
}

.pipeline-error {
  background: #fdecec;
  color: #a12626;
  border: 1px solid #f3b8b8;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 16px;
  white-space: pre-wrap;
}

.pipeline-valid {
  color: #1a7a3c;
}

.pipeline-loading {
  color: #8b96a5;
}

.pipeline-form,
.pipeline-summary,
.pipeline-materialize-review {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pipeline-form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #5a6b82;
}

.pipeline-form-row input,
.pipeline-form-row select {
  font: inherit;
  padding: 6px 8px;
  border: 1px solid #d8dee6;
  border-radius: 6px;
}

.pipeline-form-row--checkbox {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.pipeline-fieldset {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pipeline-repo-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pipeline-repo-row input {
  font: inherit;
  padding: 6px 8px;
  border: 1px solid #d8dee6;
  border-radius: 6px;
  flex: 1 1 120px;
}

.pipeline-advanced-toggle {
  align-self: flex-start;
  font-size: 12px;
  background: none;
  border: none;
  color: #5a6b82;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.pipeline-actions {
  display: flex;
  gap: 8px;
}

.pipeline-card {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pipeline-card-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pipeline-card-row input {
  font: inherit;
  padding: 4px 8px;
  border: 1px solid #d8dee6;
  border-radius: 6px;
}

.pipeline-badge {
  font-size: 11px;
  background: #f0f5ff;
  color: #3a5a99;
  border-radius: 4px;
  padding: 2px 6px;
}

.pipeline-snippet {
  background: #0d1117;
  color: #d8dee6;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 12px;
}
```

- [ ] **Step 3: Verify the app builds**

Run: `npx tsc --noEmit -p .`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/ArchVizApp.tsx src/app/globals.css
git commit -m "feat(pipeline): add header link and page styles"
```

---

### Task 18: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npx vitest run`
Expected: PASS — every test across `scripts/**` and `src/**`, including all new tests from Tasks 1, 2, 4, 5, 6.

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit -p .`
Expected: PASS

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS, or only the two known `react-hooks/exhaustive-deps` warnings on the mount-only fetch effects in `RepoMapEditor.tsx` and `MaterializeReview.tsx` (both intentional — see the comments at each effect). No new errors.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: PASS — confirms `serverExternalPackages` is correctly keeping `simple-git`/`@cdktf/hcl2json`/`@anthropic-ai/sdk` out of the route handlers' bundles and the 5 new routes are recognized as dynamic API routes.

- [ ] **Step 5: Manual end-to-end walkthrough in the browser**

1. Ensure `ANTHROPIC_API_KEY` is set in the shell the dev server runs in (materialize propose/apply and the plain scan's LLM prose step need it — same requirement the CLI already has).
2. Run: `npm run dev`
3. Open `http://localhost:3000`, click the new "Pipeline" link in the header.
4. **Repo-map step:** confirm the existing root `repo-map.yaml` (currently just the `frontend` entry for `example/template-marketing-webapp-nextjs`) loads into the form. Save without changes, confirm it advances to the Run step and `repo-map.yaml`'s content on disk is unchanged (`git diff repo-map.yaml` shows no diff).
5. **Run step:** set `out` to `public/okf-bundles/pipeline-test`, env `dev`, leave `force` unchecked, submit. Confirm the Results step shows written/skipped counts matching what a CLI run against the same repo-map would show (compare against `fluxo.txt`'s first invocation's shape).
6. **Materialize step:** click "Propose materialization". If a proposal comes back with container plans, try each review action once (rename a group, merge two groups if there are 2+, drop an actor) and confirm the UI updates immediately without a network call. Click Apply, confirm the Validate step is reached with a summary.
7. **Validate step:** click "Run validate", confirm it reports valid. Click "Copy snippet", paste it somewhere to confirm it matches the shape `index.ts` prints (`id`/`label`/`okfBasePath` all equal to `pipeline-test`).
8. Clean up the test bundle: `rm -rf public/okf-bundles/pipeline-test` (do not commit it).

- [ ] **Step 6: Report results**

Summarize pass/fail for each of Steps 1–5 before moving to Task 19. Do not proceed to documentation if any step failed — fix and re-verify first.

---

### Task 19: Document the feature in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a new section**

Add a new `###` subsection under the existing `## Architecture` heading, after the "AWS visual style" section and before "## Working with this user" — matching how every other major feature in this file is documented:

```markdown
### Visual pipeline UI (`src/app/pipeline/`, `src/app/api/pipeline/`)

`/pipeline` (linked from the "Pipeline" button in the main header) is a wizard
replacing the CLI-driven `okf-scan` workflow with a visual flow: edit
`repo-map.yaml`, run a scan, review results, propose/review/apply a
materialization, validate, and copy the resulting `DATA_SOURCES` snippet. It's
the one part of the app with real server-side execution — a deliberate,
scoped exception to "no backend in the MVP" (see "What this is" above) that
exists only to drive the same local git/filesystem/LLM work `okf-scan` already
does via the CLI.

The Route Handlers under `src/app/api/pipeline/` (`repo-map`, `scan`,
`materialize/propose`, `materialize/apply`, `validate`) call directly into
`scripts/okf-scan/**` — `scanRepos`/`recordScanManifest`
(`scripts/okf-scan/scan-repos.ts`) is the same freshness-check/scan
orchestration the CLI's `main()` uses, extracted so both share one
implementation rather than duplicating it. Reach `scripts/okf-scan/**` via the
`@okf-scan/*` path alias (`tsconfig.json`/`vitest.config.ts`), not relative
paths. `next.config.ts`'s `serverExternalPackages` keeps `simple-git`/
`@cdktf/hcl2json`/`@anthropic-ai/sdk` out of the route handlers' server
bundles, since all three do real Node-native work (spawning `git`, a native
HCL parser, Node HTTP streaming) that Next's bundler can mishandle.

The materialization review step (`src/components/pipeline/MaterializeReview.tsx`)
mirrors the same accept/rename/merge/drop review model
`.claude/skills/okf-scan-humanize/SKILL.md` already documents as a manual JSON
edit — `src/lib/pipeline/materialize-review.ts`'s `applyReviewAction` is a pure
reducer over a `MaterializationProposal`, applied entirely client-side; nothing
is written to disk until "Apply" calls `/api/pipeline/materialize/apply`,
which re-writes `.materialize-proposal.json` with the edited copy first (same
as a human hand-editing the file before running `--materialize apply` today).

Deliberately does **not** write the `DATA_SOURCES` entry into
`src/lib/data-sources.ts` automatically — the Validate step shows the same
copy-paste snippet the CLI already prints (`dataSourceSnippet` in
`src/lib/pipeline/data-source-snippet.ts`), left for the user to paste by
hand, since that file requires a dev-server reload to pick up a new dynamic
import either way. See `docs/superpowers/specs/2026-07-07-pipeline-visual-flow-design.md`
for the full design and non-goals (no multiple repo-map configs, no live
progress streaming during a scan).
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document the visual pipeline UI in CLAUDE.md"
```

---

## Self-Review Notes

- **Spec coverage:** every wizard step from the design spec (repo-map editor, run, results, materialize propose/review/apply, validate + snippet) has a corresponding task (13, 14, 14, 15, 15, 16). The "Non-goals" (no `DATA_SOURCES` auto-write, no multiple repo-map configs, no live progress streaming, no component structure changes) are respected throughout and called out explicitly in Task 19's doc addition.
- **Type consistency:** `RunFields` is defined once in `RunForm.tsx` and imported via `import type { RunFields } from "./RunForm"` everywhere else (`PipelineWizard.tsx`, `MaterializeReview.tsx`, `ValidateAndSnippet.tsx`) — no redefinition. `ScanRequestFields`/`parseScanRequest`/`errorResponse` from Task 4 are the only request-parsing path used by all 3 scan/materialize routes (Tasks 8–10). `MaterializeReviewAction`/`applyReviewAction` field names (`containerId`, `groupContainerId`, `contextName`, `intoGroupContainerId`, `fromGroupContainerId`, `index`, `title`) match exactly between the reducer (Task 6) and its only caller (`MaterializeReview.tsx`, Task 15).
- **No placeholders:** every task has complete, runnable code — no "add validation here"-style gaps. The two known lint warnings (Task 18, Step 3) are called out explicitly rather than silently ignored.
