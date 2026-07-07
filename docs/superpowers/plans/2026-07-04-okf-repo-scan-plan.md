# OKF Repo-Scan Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `scripts/okf-scan/`, a Node/TypeScript CLI that scans a Terraform repo plus a set of Lambda and frontend repos and generates an OKF bundle (matching the conventions of `public/okf-bundles/order-system/`) for one environment at a time (`dev`/`hml`/`prd`), re-runnable cheaply thanks to a committed scan manifest and a repo-level freshness short-circuit that skips repos unchanged since the last run.

**Architecture:** A pipeline of small, independently-testable stages, wired together by one CLI entrypoint: `check-repo-freshness` (cheap `git ls-remote`/file-hash check per repo) → `resolve-worktrees` (isolated `git worktree` per repo+env, never touching the user's own checkout) → three scanners (`scan-terraform`, `scan-lambda-repo`, `scan-frontend-repo`) that each emit structured "facts" JSON with evidence, never guessing at topology → `synthesize` (deterministic OKF frontmatter/sections + one LLM call per *changed* concept, grounded only in that concept's facts) → the existing `validateArchModel`. Driven by a user-authored `repo-map.yaml`.

**Tech Stack:** TypeScript run via `tsx` (matching `scripts/validate-model.ts`'s existing convention), `vitest` (new — this repo has no test runner yet, see Task 1), `yaml` (repo-map parsing), `simple-git` (`ls-remote`/`fetch`/`worktree`), `@cdktf/hcl2json` (Terraform HCL→JSON without needing `terraform init` or credentials), the `typescript` compiler API (already a devDependency, used here for syntactic AST scanning — no type-checker/Program needed), `@anthropic-ai/sdk` (LLM prose calls), Node's built-in `crypto` for hashing.

**Reference spec:** `docs/superpowers/specs/2026-07-03-okf-repo-scan-design.md` — read it alongside this plan; this plan does not re-explain the *why* behind each design decision, only the *how* of building it.

---

## Progress status (as of 2026-07-04, subagent-driven-development execution) — PLAN COMPLETE

**All 21 tasks (Milestones 0-7) done, each implemented via TDD and code-reviewed (spec compliance + code quality):**

| Task | Commit(s) | Review status |
|---|---|---|
| 1. Vitest test runner | `108aa46` | ✅ spec + quality approved |
| 2. Core types | `2f1762f` | ✅ spec + quality approved |
| 3. Content hashing helper | `5848b84` | ✅ spec + quality approved (batch review w/ 4-6) |
| 4. Bounded-concurrency pool | `015ef7c` | ✅ spec + quality approved (batch review w/ 3,5,6) |
| 5. Scan manifest load/save | `fd4cbe4` | ✅ spec + quality approved (batch review w/ 3,4,6) |
| 6. repo-map.yaml loader | `5cfa847` | ✅ spec + quality approved (batch review w/ 3-5) |
| 7. HCL→JSON parsing wrapper | `b211c06` | ✅ spec + quality approved (batch review w/ 8-9) |
| 8. Terraform resource-type lookup | `da69b95` | ✅ spec + quality approved (batch review w/ 7,9) |
| 9. Terraform fact extraction | `5165969` | ✅ spec + quality approved (batch review w/ 7-8) |
| 10. git ls-remote wrapper | `07e3291` | ✅ spec + quality approved (batch review w/ 11-12) |
| 11. Repo-level freshness check | `3c80d40` | ✅ spec + quality approved (batch review w/ 10,12) |
| 12. Isolated worktree resolution | `980d5b7`, fixed in `e24f96b` | ✅ spec approved; quality review found a **critical Windows path-separator bug** in `worktreeExists` (reuse path always fell through to `git worktree add`, crashing on repeat runs) — fixed in `e24f96b` with a regression test, re-reviewed and approved. One follow-up noted but not blocking: no test coverage yet for the "worktree registered but directory manually deleted" prune-fallback branch. |
| 13. Shared TypeScript AST helpers | `2471639` | ✅ spec + quality approved (batch review w/ 14-15) |
| 14. Lambda repo scanner | `f9479d3` | ✅ spec + quality approved (batch review w/ 13,15) |
| 15. Frontend repo scanner | `c12832d` | ✅ spec + quality approved (batch review w/ 13-14); required an unplanned one-line `tsconfig.json` exclude fix (`89cc069`) since the Lambda fixture intentionally imports uninstalled AWS SDK packages, which is fine for vitest's syntactic parsing but broke the whole-project `tsc --noEmit` pass — verified necessary and narrowly scoped by both reviewers. |
| 16. CODEOWNERS parsing | `6174a6e` | ✅ spec + quality approved (reviewed retroactively at the start of the next session — was previously implemented but unreviewed). Quality follow-ups noted but not blocking: no test coverage for the `.github/CODEOWNERS`/`docs/CODEOWNERS` fallback paths or for an unowned-pattern line resetting a broader rule's match. |
| 17. OKF markdown read/write/merge | `8c83b36`, fixed in `b22ad89` | ✅ spec approved; quality review found real issues — `readPreserved`'s ad-hoc `# Links` parsing duplicated more-robust logic already in `okf-import.ts` (extracted to shared `src/lib/okf-sections.ts`), `groupBundlePath` had no cycle guard / silently produced a bogus path on a missing group id (now throws clearly), and `stringifyFrontmatter` didn't escape values that wouldn't round-trip through `parseFrontmatter` (newlines, empty strings, `true`/`false`-looking strings — now quoted/escaped). All fixed in `b22ad89` with added test coverage, re-reviewed and approved. |
| 18. LLM prose client | `5be9b70`, fixed in `f57570a` | ✅ spec approved; quality review found a real prompt-building bug (`.filter(Boolean)` silently stripped the blank-line separator between facts and the final instruction) and a real correctness risk (Claude Sonnet 5 runs adaptive thinking by default when `thinking` is omitted, sharing the same `max_tokens` budget as visible output — risked truncating the small 400-token response). Fixed in `f57570a`: explicit `thinking: {type: "disabled"}` (this task needs no reasoning), `max_tokens` raised to 1024, a `stop_reason === "max_tokens"` truncation check, plus negative-path test coverage (non-429 errors, exhausted retries, no-text-content response) and fake timers to remove real wall-clock delay from the retry test. Re-reviewed and approved. |
| 19. Synthesis orchestration with incremental skip | `0286cda`, fixed in `4970e70` | ✅ spec approved; quality review found 4 real Important issues — `writeChildIndexes` grouped children by string-splitting `id` instead of the authoritative `parentId` (could silently orphan non-conventionally-named concepts), `writeGroupFiles` had no cycle guard (mirroring the same gap fixed in Task 17's `groupBundlePath`, and could crash the whole run via an uncaught throw deep in `buildConceptMarkdown`), a concept literally id'd `"groups"` could silently overwrite the reserved AWS-groups directory's `index.md`, and one concept's LLM failure aborted the entire batch (losing already-completed work/manifest updates for other concepts). All fixed in `4970e70`: grouping by `parentId`, an early `validateGroups()` cycle/dangling-ref check mirroring `groupBundlePath`'s algorithm, an early reserved-name collision check, and per-concept error isolation via a new `SynthesizeSummary.failed` field — plus `force`-option, groups-happy-path, and `needsReview`-surfacing test coverage. Re-reviewed and approved. |
| 20. CLI entrypoint | `f8450e9`, fixed in `b7ac297` | ✅ spec approved; quality review found a **critical bug** — `main()` reused its stale pre-synthesis manifest object for the final save, clobbering the concept-level inputHash/facts updates `synthesize()` had already persisted, silently defeating the entire incremental-rerun design (every run would redo full LLM synthesis). Fixed in `b7ac297` by reloading the manifest from disk after `synthesize()` returns, before applying `main()`'s own `_repos`/`lambdaEnvVarBindings` updates and saving. Re-reviewed and approved. Tracked-but-not-blocking follow-ups: AWS network-group boxes are dropped from a regenerated bundle on a run where only a Lambda/frontend repo changed (Terraform's cached groups aren't persisted in the manifest), and `--concurrency-*` flags aren't validated as numbers (garbage input produces `NaN`). |
| 21. End-to-end fixture test through the real validator | `5adf363` | ✅ spec + quality approved. Required one legitimate infrastructure fix alongside the test itself: `vitest.config.ts` needed a `resolve.alias` for `@` → `./src` (mirroring `tsconfig.json`), since this was the first `scripts/**/*.test.ts` file to transitively import from `src/lib/` (`okf-import.ts` → `aws-icons.ts`'s `@/data/aws-icon-manifest.json`) and vitest doesn't read tsconfig `paths` on its own. No real bugs found in `synthesize.ts`/`markdown.ts` during this integration pass — all prior quality-fix-pass guards (cycle detection, reserved-name collision, frontmatter escaping) behaved correctly against the fixture. |

**Final state:** 71/71 tests passing across 20 test files, `npx tsc --noEmit -p .` clean, `npm run lint` clean (one pre-existing unrelated warning in a Lambda scanner test fixture). The `scripts/okf-scan` CLI is feature-complete per this plan — see `docs/superpowers/specs/2026-07-03-okf-repo-scan-design.md` for usage/design background. Not yet exercised against a real `repo-map.yaml`/live git remotes/a real `ANTHROPIC_API_KEY` (by design — Task 20/21 scoped that to manual verification and fixture-based testing respectively, since automating it would require real credentials and external repos).

---

## Milestone 0: Test runner

### Task 1: Add Vitest as the test runner

CLAUDE.md notes "no test runner is configured yet." Every later task in this plan is TDD, so this has to land first.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `scripts/okf-scan/__tests__/smoke.test.ts`

- [x] **Step 1: Install Vitest**

Run: `npm install -D vitest`

- [x] **Step 2: Add test scripts to `package.json`**

Add these two entries to the `"scripts"` block (alongside the existing `dev`/`build`/`start`/`lint`/`validate`):

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [x] **Step 3: Create the Vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/**/*.test.ts"],
  },
});
```

- [x] **Step 4: Write a smoke test**

```typescript
// scripts/okf-scan/__tests__/smoke.test.ts
import { describe, expect, it } from "vitest";

describe("vitest setup", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [x] **Step 5: Run the test suite**

Run: `npm test`
Expected: 1 file, 1 test, PASS.

- [x] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts scripts/okf-scan/__tests__/smoke.test.ts
git commit -m "test: add vitest as the project's test runner"
```

---

## Milestone 1: Shared infrastructure

Everything the scanners and synthesizer both depend on: types, hashing, a concurrency pool, the manifest reader/writer, and the `repo-map.yaml` loader.

### Task 2: Core types

Pure type declarations — no runtime behavior to test, so this task type-checks instead of running a test.

**Files:**
- Create: `scripts/okf-scan/types.ts`

- [x] **Step 1: Write the shared types**

```typescript
// scripts/okf-scan/types.ts
import type { AwsGroupKind, C4Level, RelationKind } from "../../src/lib/types";

export type Environment = "dev" | "hml" | "prd";

export interface BranchMap {
  dev: string;
  hml: string;
  prd: string;
}

export interface RepoMapConfig {
  terraform: {
    path: string;
    envFiles: { dev: string; hml: string; prd: string };
  };
  resources: Record<string, { repo: string; branch: BranchMap }>;
  frontend: { repo: string; branch: BranchMap }[];
}

/** Id of the single synthesized root "context"-level node every top-level container attaches to. */
export const ROOT_CONTEXT_ID = "platform";

/** One evidenced relation a scanner found between two concepts. */
export interface FactRelation {
  targetId: string;
  kind?: RelationKind;
  label?: string;
  /** human-readable justification, e.g. "PutItemCommand + env var ORDERS_TABLE bound in TF to aws_dynamodb_table.orders_table" */
  evidence: string;
}

/** Structured, evidence-only output of a scanner for one OKF concept. Never contains prose. */
export interface ConceptFacts {
  id: string;
  type: string;
  level: C4Level;
  parentId: string | null;
  awsResourceType?: string;
  schema?: Record<string, string | number | boolean>;
  relations?: FactRelation[];
  groupId?: string | null;
  owner?: string;
  /** absolute paths this concept's facts were derived from, used to compute inputHash */
  sourceFiles: string[];
  /** facts the scanner could not fully resolve (dynamic value, unrecognized call, etc.) */
  needsReview?: string[];
}

export interface GroupFact {
  id: string;
  kind: AwsGroupKind;
  name: string;
  parentGroupId?: string | null;
  subnetType?: "public" | "private";
}

export interface ScanResult {
  concepts: ConceptFacts[];
  groups: GroupFact[];
  /** Lambda resource name -> its Terraform environment.variables map, e.g. { ORDERS_TABLE: "aws_dynamodb_table.orders_table" } */
  lambdaEnvVarBindings: Record<string, Record<string, string>>;
}

export interface ManifestRepoEntry {
  lastScannedRef: string;
  env: Environment;
}

export interface ManifestConceptEntry {
  inputHash: string;
  facts: ConceptFacts;
  lastScannedAt: string;
}

export interface ScanManifest {
  _repos: Record<string, ManifestRepoEntry>;
  concepts: Record<string, ManifestConceptEntry>;
  /**
   * Cached from the last Terraform scan so the CLI can skip re-parsing
   * Terraform when its freshness check is unchanged, while a Lambda repo
   * that *did* change still has env-var bindings to resolve against.
   */
  lambdaEnvVarBindings?: Record<string, Record<string, string>>;
}

export function emptyManifest(): ScanManifest {
  return { _repos: {}, concepts: {} };
}
```

- [x] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add scripts/okf-scan/types.ts
git commit -m "feat: add shared types for the okf-scan pipeline"
```

### Task 3: Content hashing helper

**Files:**
- Create: `scripts/okf-scan/hash.ts`
- Test: `scripts/okf-scan/hash.test.ts`

- [x] **Step 1: Write the failing test**

```typescript
// scripts/okf-scan/hash.test.ts
import { describe, expect, it } from "vitest";
import { hashContent, hashJson } from "./hash";

describe("hashContent", () => {
  it("returns the same hash for the same string", () => {
    expect(hashContent("hello")).toBe(hashContent("hello"));
  });

  it("returns different hashes for different strings", () => {
    expect(hashContent("hello")).not.toBe(hashContent("world"));
  });
});

describe("hashJson", () => {
  it("returns the same hash regardless of object identity", () => {
    const a = { x: 1, y: [1, 2, 3] };
    const b = { x: 1, y: [1, 2, 3] };
    expect(hashJson(a)).toBe(hashJson(b));
  });

  it("returns different hashes for different content", () => {
    expect(hashJson({ x: 1 })).not.toBe(hashJson({ x: 2 }));
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- hash.test.ts`
Expected: FAIL with "Cannot find module './hash'"

- [x] **Step 3: Write the implementation**

```typescript
// scripts/okf-scan/hash.ts
import { createHash } from "node:crypto";

export function hashContent(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashJson(value: unknown): string {
  return hashContent(JSON.stringify(value));
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- hash.test.ts`
Expected: PASS (4 tests).

- [x] **Step 5: Commit**

```bash
git add scripts/okf-scan/hash.ts scripts/okf-scan/hash.test.ts
git commit -m "feat: add content hashing helper for incremental scanning"
```

### Task 4: Bounded-concurrency pool

**Files:**
- Create: `scripts/okf-scan/concurrency.ts`
- Test: `scripts/okf-scan/concurrency.test.ts`

- [x] **Step 1: Write the failing test**

```typescript
// scripts/okf-scan/concurrency.test.ts
import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
  it("returns results in the same order as the input, regardless of completion order", async () => {
    const items = [30, 10, 20];
    const results = await mapWithConcurrency(items, 3, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms;
    });
    expect(results).toEqual([30, 10, 20]);
  });

  it("never runs more than `limit` tasks concurrently", async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);
    await mapWithConcurrency(items, 3, async (i) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return i;
    });
    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it("propagates a rejection from any task", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (i) => {
        if (i === 2) throw new Error("boom");
        return i;
      })
    ).rejects.toThrow("boom");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- concurrency.test.ts`
Expected: FAIL with "Cannot find module './concurrency'"

- [x] **Step 3: Write the implementation**

```typescript
// scripts/okf-scan/concurrency.ts
/**
 * Runs `fn` over `items` with at most `limit` concurrent calls in flight.
 * Results preserve input order regardless of which task finishes first.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current], current);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- concurrency.test.ts`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add scripts/okf-scan/concurrency.ts scripts/okf-scan/concurrency.test.ts
git commit -m "feat: add bounded-concurrency pool for parallel scanning"
```

### Task 5: Scan manifest load/save

**Files:**
- Create: `scripts/okf-scan/manifest.ts`
- Test: `scripts/okf-scan/manifest.test.ts`

- [x] **Step 1: Write the failing test**

```typescript
// scripts/okf-scan/manifest.test.ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadManifest, saveManifest } from "./manifest";
import type { ScanManifest } from "./types";

describe("manifest", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "okf-scan-manifest-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns an empty manifest when none exists yet", async () => {
    const manifest = await loadManifest(dir);
    expect(manifest).toEqual({ _repos: {}, concepts: {} });
  });

  it("round-trips a saved manifest", async () => {
    const manifest: ScanManifest = {
      _repos: { "orders-service": { lastScannedRef: "abc123", env: "dev" } },
      concepts: {
        "orders-service/handler": {
          inputHash: "deadbeef",
          facts: {
            id: "orders-service/handler",
            type: "AWS Lambda Function",
            level: "component",
            parentId: "orders-service",
            sourceFiles: ["/repo/handler.ts"],
          },
          lastScannedAt: "2026-07-04T00:00:00.000Z",
        },
      },
    };
    await saveManifest(dir, manifest);
    const loaded = await loadManifest(dir);
    expect(loaded).toEqual(manifest);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- manifest.test.ts`
Expected: FAIL with "Cannot find module './manifest'"

- [x] **Step 3: Write the implementation**

```typescript
// scripts/okf-scan/manifest.ts
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptyManifest, type ScanManifest } from "./types";

export const MANIFEST_FILENAME = ".scan-manifest.json";

export function manifestPath(bundleDir: string): string {
  return path.join(bundleDir, MANIFEST_FILENAME);
}

export async function loadManifest(bundleDir: string): Promise<ScanManifest> {
  try {
    const raw = await readFile(manifestPath(bundleDir), "utf-8");
    return JSON.parse(raw) as ScanManifest;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyManifest();
    throw err;
  }
}

export async function saveManifest(bundleDir: string, manifest: ScanManifest): Promise<void> {
  await writeFile(manifestPath(bundleDir), `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- manifest.test.ts`
Expected: PASS (2 tests). Note: `saveManifest` writes into `dir` directly, which doesn't exist as a real bundle dir in this test — `mkdtemp` already creates `dir` itself, so no separate `mkdir` is needed here.

- [x] **Step 5: Commit**

```bash
git add scripts/okf-scan/manifest.ts scripts/okf-scan/manifest.test.ts
git commit -m "feat: add scan manifest load/save for incremental scanning"
```

### Task 6: `repo-map.yaml` loader

**Files:**
- Create: `scripts/okf-scan/repo-map.ts`
- Create: `scripts/okf-scan/__fixtures__/repo-map.example.yaml`
- Test: `scripts/okf-scan/repo-map.test.ts`

- [x] **Step 1: Install the `yaml` package**

Run: `npm install yaml`

- [x] **Step 2: Create the example fixture (also doubles as the user-facing example)**

```yaml
# scripts/okf-scan/__fixtures__/repo-map.example.yaml
terraform:
  path: ../infra-terraform
  envFiles:
    dev: dev.tf
    hml: hml.tf
    prd: prd.tf

resources:
  aws_lambda_function.orders:
    repo: ../orders-service
    branch: { dev: develop, hml: staging, prd: main }
  aws_lambda_function.payments:
    repo: ../payments-service
    branch: { dev: develop, hml: staging, prd: main }

frontend:
  - repo: ../web-storefront
    branch: { dev: develop, hml: staging, prd: main }
```

- [x] **Step 3: Write the failing test**

```typescript
// scripts/okf-scan/repo-map.test.ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadRepoMap } from "./repo-map";

const FIXTURE = path.join(__dirname, "__fixtures__", "repo-map.example.yaml");

describe("loadRepoMap", () => {
  it("parses a valid repo-map.yaml", async () => {
    const config = await loadRepoMap(FIXTURE);
    expect(config.terraform.path).toBe("../infra-terraform");
    expect(config.terraform.envFiles.dev).toBe("dev.tf");
    expect(config.resources["aws_lambda_function.orders"].repo).toBe("../orders-service");
    expect(config.resources["aws_lambda_function.orders"].branch.hml).toBe("staging");
    expect(config.frontend).toHaveLength(1);
    expect(config.frontend[0].repo).toBe("../web-storefront");
  });

  it("throws a descriptive error when a required field is missing", async () => {
    await expect(loadRepoMap(path.join(__dirname, "__fixtures__", "repo-map.missing-field.yaml"))).rejects.toThrow(
      /repo-map/i
    );
  });
});
```

- [x] **Step 4: Add the second fixture used by the error-path test**

```yaml
# scripts/okf-scan/__fixtures__/repo-map.missing-field.yaml
terraform:
  path: ../infra-terraform
  envFiles:
    dev: dev.tf
    hml: hml.tf
    prd: prd.tf

resources:
  aws_lambda_function.orders:
    repo: ../orders-service
    # branch intentionally omitted

frontend: []
```

- [x] **Step 5: Run test to verify it fails**

Run: `npm test -- repo-map.test.ts`
Expected: FAIL with "Cannot find module './repo-map'"

- [x] **Step 6: Write the implementation**

```typescript
// scripts/okf-scan/repo-map.ts
import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { z } from "zod";
import type { RepoMapConfig } from "./types";

const BranchMapSchema = z.object({
  dev: z.string().min(1),
  hml: z.string().min(1),
  prd: z.string().min(1),
});

const RepoMapSchema = z.object({
  terraform: z.object({
    path: z.string().min(1),
    envFiles: BranchMapSchema,
  }),
  resources: z.record(
    z.string(),
    z.object({
      repo: z.string().min(1),
      branch: BranchMapSchema,
    })
  ),
  frontend: z.array(
    z.object({
      repo: z.string().min(1),
      branch: BranchMapSchema,
    })
  ),
});

export async function loadRepoMap(filePath: string): Promise<RepoMapConfig> {
  const raw = await readFile(filePath, "utf-8");
  const parsed = parse(raw);
  const result = RepoMapSchema.safeParse(parsed);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
    throw new Error(`Invalid repo-map.yaml at ${filePath}:\n- ${messages.join("\n- ")}`);
  }
  return result.data;
}
```

- [x] **Step 7: Run test to verify it passes**

Run: `npm test -- repo-map.test.ts`
Expected: PASS (2 tests).

- [x] **Step 8: Commit**

```bash
git add scripts/okf-scan/repo-map.ts scripts/okf-scan/repo-map.test.ts scripts/okf-scan/__fixtures__/repo-map.example.yaml scripts/okf-scan/__fixtures__/repo-map.missing-field.yaml package.json package-lock.json
git commit -m "feat: add repo-map.yaml loader with validation"
```

---

## Milestone 2: Terraform scanner

### Task 7: HCL→JSON parsing wrapper

**Files:**
- Create: `scripts/okf-scan/terraform/hcl.ts`
- Create: `scripts/okf-scan/terraform/__fixtures__/hcl-merge/a.tf`
- Create: `scripts/okf-scan/terraform/__fixtures__/hcl-merge/b.tf`
- Test: `scripts/okf-scan/terraform/hcl.test.ts`

- [x] **Step 1: Install `@cdktf/hcl2json`**

Run: `npm install @cdktf/hcl2json`

- [x] **Step 2: Add fixture files that declare the same resource type across two files**

```hcl
# scripts/okf-scan/terraform/__fixtures__/hcl-merge/a.tf
resource "aws_dynamodb_table" "orders_table" {
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
}
```

```hcl
# scripts/okf-scan/terraform/__fixtures__/hcl-merge/b.tf
resource "aws_dynamodb_table" "payments_table" {
  name         = "payments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
}
```

- [x] **Step 3: Write the failing test**

```typescript
// scripts/okf-scan/terraform/hcl.test.ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseTerraformDir } from "./hcl";

const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "hcl-merge");

describe("parseTerraformDir", () => {
  it("merges resource blocks of the same type declared across multiple files", async () => {
    const { raw, fileContents } = await parseTerraformDir(FIXTURE_DIR, ["a.tf", "b.tf"]);
    const tables = (raw.resource as Record<string, Record<string, unknown>>).aws_dynamodb_table;
    expect(Object.keys(tables).sort()).toEqual(["orders_table", "payments_table"]);
    expect(Object.keys(fileContents).sort()).toEqual(["a.tf", "b.tf"]);
  });
});
```

- [x] **Step 4: Run test to verify it fails**

Run: `npm test -- terraform/hcl.test.ts`
Expected: FAIL with "Cannot find module './hcl'"

- [x] **Step 5: Write the implementation**

```typescript
// scripts/okf-scan/terraform/hcl.ts
import { parse as parseHcl } from "@cdktf/hcl2json";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface ParsedTerraform {
  raw: Record<string, unknown>;
  /** filename -> raw file text, kept around so callers can hash inputs */
  fileContents: Record<string, string>;
}

/** Shallow-merges two hcl2json outputs one level past the block-type key (e.g. `resource.aws_lambda_function.<name>`). */
function mergeHclJson(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...a };
  for (const [topKey, bVal] of Object.entries(b)) {
    if (typeof bVal !== "object" || bVal === null || Array.isArray(bVal)) {
      result[topKey] = bVal;
      continue;
    }
    const aVal = (result[topKey] ?? {}) as Record<string, unknown>;
    const mergedSection: Record<string, unknown> = { ...aVal };
    for (const [subKey, subVal] of Object.entries(bVal as Record<string, unknown>)) {
      if (typeof subVal !== "object" || subVal === null || Array.isArray(subVal)) {
        mergedSection[subKey] = subVal;
        continue;
      }
      mergedSection[subKey] = { ...(aVal[subKey] as object | undefined), ...(subVal as object) };
    }
    result[topKey] = mergedSection;
  }
  return result;
}

/** Parses every named `.tf` file in `dir` (no `terraform init`, no state, no credentials) and merges them. */
export async function parseTerraformDir(dir: string, files: string[]): Promise<ParsedTerraform> {
  const fileContents: Record<string, string> = {};
  let merged: Record<string, unknown> = {};
  for (const file of files) {
    const content = await readFile(path.join(dir, file), "utf-8");
    fileContents[file] = content;
    const json = (await parseHcl(file, content)) as Record<string, unknown>;
    merged = mergeHclJson(merged, json);
  }
  return { raw: merged, fileContents };
}
```

- [x] **Step 6: Run test to verify it passes**

Run: `npm test -- terraform/hcl.test.ts`
Expected: PASS (1 test).

- [x] **Step 7: Commit**

```bash
git add scripts/okf-scan/terraform/hcl.ts scripts/okf-scan/terraform/hcl.test.ts scripts/okf-scan/terraform/__fixtures__/hcl-merge package.json package-lock.json
git commit -m "feat: add Terraform HCL to JSON parsing wrapper"
```

### Task 8: Terraform resource-type lookup table

**Files:**
- Create: `scripts/okf-scan/terraform/resource-types.ts`
- Test: `scripts/okf-scan/terraform/resource-types.test.ts`

- [x] **Step 1: Write the failing test**

```typescript
// scripts/okf-scan/terraform/resource-types.test.ts
import { describe, expect, it } from "vitest";
import { resourceTypeInfo } from "./resource-types";

describe("resourceTypeInfo", () => {
  it("maps aws_lambda_function to the AWS Lambda Function label", () => {
    expect(resourceTypeInfo("aws_lambda_function")).toEqual({ label: "AWS Lambda Function" });
  });

  it("returns undefined for an unknown resource type", () => {
    expect(resourceTypeInfo("aws_totally_made_up_thing")).toBeUndefined();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- terraform/resource-types.test.ts`
Expected: FAIL with "Cannot find module './resource-types'"

- [x] **Step 3: Write the implementation**

```typescript
// scripts/okf-scan/terraform/resource-types.ts
export interface ResourceTypeInfo {
  /** human label used both for the OKF `type` field (drives icon lookup via findAwsIcon) and `aws_resource_type` */
  label: string;
}

/**
 * Maps a Terraform resource type to the label vocabulary findAwsIcon()
 * (src/lib/aws-icons.ts) already resolves against aws-icon-manifest.json.
 * Extend this table as new resource types need to be scanned — it's a plain
 * lookup, not a placeholder.
 */
export const TERRAFORM_RESOURCE_TYPES: Record<string, ResourceTypeInfo> = {
  aws_lambda_function: { label: "AWS Lambda Function" },
  aws_dynamodb_table: { label: "Amazon DynamoDB Table" },
  aws_sqs_queue: { label: "Amazon SQS Queue" },
  aws_sns_topic: { label: "Amazon SNS Topic" },
  aws_apigatewayv2_api: { label: "Amazon API Gateway" },
  aws_api_gateway_rest_api: { label: "Amazon API Gateway" },
  aws_s3_bucket: { label: "Amazon S3 Bucket" },
  aws_cloudfront_distribution: { label: "Amazon CloudFront Distribution" },
};

export function resourceTypeInfo(terraformType: string): ResourceTypeInfo | undefined {
  return TERRAFORM_RESOURCE_TYPES[terraformType];
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- terraform/resource-types.test.ts`
Expected: PASS (2 tests).

- [x] **Step 5: Commit**

```bash
git add scripts/okf-scan/terraform/resource-types.ts scripts/okf-scan/terraform/resource-types.test.ts
git commit -m "feat: add Terraform resource type to OKF label lookup table"
```

### Task 9: Terraform fact extraction

**Files:**
- Create: `scripts/okf-scan/terraform/scan-terraform.ts`
- Create: `scripts/okf-scan/terraform/__fixtures__/env-scan/main.tf`
- Create: `scripts/okf-scan/terraform/__fixtures__/env-scan/dev.tf`
- Create: `scripts/okf-scan/terraform/__fixtures__/env-scan/hml.tf`
- Test: `scripts/okf-scan/terraform/scan-terraform.test.ts`

- [x] **Step 1: Add fixture Terraform files**

```hcl
# scripts/okf-scan/terraform/__fixtures__/env-scan/main.tf
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  availability_zone = "us-east-1a"
}

resource "aws_dynamodb_table" "orders_table" {
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
}
```

```hcl
# scripts/okf-scan/terraform/__fixtures__/env-scan/dev.tf
resource "aws_lambda_function" "orders" {
  function_name = "orders-dev"
  runtime       = "nodejs20.x"
  memory_size   = 512

  environment {
    variables = {
      ORDERS_TABLE = aws_dynamodb_table.orders_table.name
    }
  }
}
```

```hcl
# scripts/okf-scan/terraform/__fixtures__/env-scan/hml.tf
resource "aws_lambda_function" "orders_hml_only" {
  function_name = "orders-hml-only"
  runtime       = "nodejs20.x"
}
```

- [x] **Step 2: Write the failing test**

```typescript
// scripts/okf-scan/terraform/scan-terraform.test.ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanTerraform } from "./scan-terraform";

const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "env-scan");

describe("scanTerraform", () => {
  it("extracts concepts, groups, and env-var bindings for the selected environment only", async () => {
    const result = await scanTerraform(
      { path: FIXTURE_DIR, envFiles: { dev: "dev.tf", hml: "hml.tf", prd: "prd.tf" } },
      "dev"
    );

    const ids = result.concepts.map((c) => c.id).sort();
    expect(ids).toEqual(["orders", "orders_table"]);
    expect(ids).not.toContain("orders_hml_only");

    const orders = result.concepts.find((c) => c.id === "orders")!;
    expect(orders.type).toBe("AWS Lambda Function");
    expect(orders.level).toBe("container");
    expect(orders.parentId).toBe("platform");
    expect(orders.schema?.memory_size).toBe(512);
    expect(orders.relations).toEqual([
      {
        targetId: "orders_table",
        evidence:
          "environment.variables.ORDERS_TABLE bound to ${aws_dynamodb_table.orders_table.name} in Terraform",
      },
    ]);

    expect(result.lambdaEnvVarBindings.orders).toEqual({ ORDERS_TABLE: "aws_dynamodb_table.orders_table" });

    const vpc = result.groups.find((g) => g.id === "vpc-main")!;
    expect(vpc.kind).toBe("vpc");
    const subnet = result.groups.find((g) => g.id === "subnet-private_a")!;
    expect(subnet.parentGroupId).toBe("vpc-main");
    expect(subnet.subnetType).toBe("private");
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npm test -- terraform/scan-terraform.test.ts`
Expected: FAIL with "Cannot find module './scan-terraform'"

- [x] **Step 4: Write the implementation**

```typescript
// scripts/okf-scan/terraform/scan-terraform.ts
import { readdir } from "node:fs/promises";
import path from "node:path";
import { ROOT_CONTEXT_ID, type ConceptFacts, type Environment, type GroupFact, type RepoMapConfig, type ScanResult } from "../types";
import { parseTerraformDir } from "./hcl";
import { resourceTypeInfo } from "./resource-types";

type TfBlock = Record<string, unknown>;

function getResourceBlocks(raw: Record<string, unknown>, tfType: string): Record<string, TfBlock[]> {
  const resourceSection = (raw.resource ?? {}) as Record<string, Record<string, TfBlock[]>>;
  return resourceSection[tfType] ?? {};
}

interface Reference {
  type: string;
  name: string;
  attr: string;
}

/** Extracts every `${type.name.attr}` interpolation reference found anywhere inside a value. */
function findReferences(value: unknown, refs: Reference[] = []): Reference[] {
  if (typeof value === "string") {
    const re = /\$\{([a-z0-9_]+)\.([a-z0-9_-]+)\.([a-z0-9_]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(value))) refs.push({ type: m[1], name: m[2], attr: m[3] });
  } else if (Array.isArray(value)) {
    value.forEach((v) => findReferences(v, refs));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => findReferences(v, refs));
  }
  return refs;
}

function schemaFromAttrs(attrs: TfBlock, skip: Set<string>): Record<string, string | number | boolean> {
  const schema: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (skip.has(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      schema[key] = value;
    }
  }
  return schema;
}

export async function scanTerraform(config: RepoMapConfig["terraform"], env: Environment): Promise<ScanResult> {
  const entries = await readdir(config.path);
  const excludedEnvFiles = new Set(
    Object.entries(config.envFiles)
      .filter(([e]) => e !== env)
      .map(([, file]) => file)
  );
  const files = entries.filter((f) => f.endsWith(".tf") && !excludedEnvFiles.has(f)).sort();
  const sourceFiles = files.map((f) => path.join(config.path, f));
  const { raw } = await parseTerraformDir(config.path, files);

  const concepts: ConceptFacts[] = [];
  const groups: GroupFact[] = [];
  const lambdaEnvVarBindings: Record<string, Record<string, string>> = {};

  for (const [name] of Object.entries(getResourceBlocks(raw, "aws_vpc"))) {
    groups.push({ id: `vpc-${name}`, kind: "vpc", name, parentGroupId: null });
  }

  for (const [name, instances] of Object.entries(getResourceBlocks(raw, "aws_subnet"))) {
    const attrs = instances[0] ?? {};
    const vpcRef = findReferences(attrs.vpc_id).find((r) => r.type === "aws_vpc");
    const az = typeof attrs.availability_zone === "string" ? attrs.availability_zone : undefined;
    groups.push({
      id: `subnet-${name}`,
      kind: "subnet",
      name: az ? `${name} (${az})` : name,
      parentGroupId: vpcRef ? `vpc-${vpcRef.name}` : null,
      subnetType: name.toLowerCase().includes("private") ? "private" : "public",
    });
  }

  for (const [name, instances] of Object.entries(getResourceBlocks(raw, "aws_lambda_function"))) {
    const attrs = instances[0] ?? {};
    const info = resourceTypeInfo("aws_lambda_function")!;
    const relations: NonNullable<ConceptFacts["relations"]> = [];
    const needsReview: string[] = [];

    const envBlock = (attrs.environment as { variables?: Record<string, unknown> }[] | undefined)?.[0];
    const bindings: Record<string, string> = {};
    for (const [varName, varValue] of Object.entries(envBlock?.variables ?? {})) {
      const refs = findReferences(varValue);
      if (refs.length === 1) {
        bindings[varName] = `${refs[0].type}.${refs[0].name}`;
        relations.push({
          targetId: refs[0].name,
          evidence: `environment.variables.${varName} bound to \${${refs[0].type}.${refs[0].name}.${refs[0].attr}} in Terraform`,
        });
      } else if (refs.length > 1) {
        needsReview.push(`environment.variables.${varName} references more than one resource: ${JSON.stringify(varValue)}`);
      }
    }
    lambdaEnvVarBindings[name] = bindings;

    concepts.push({
      id: name,
      type: info.label,
      awsResourceType: info.label,
      level: "container",
      parentId: ROOT_CONTEXT_ID,
      schema: schemaFromAttrs(attrs, new Set(["environment", "depends_on"])),
      relations,
      groupId: null,
      sourceFiles,
      needsReview: needsReview.length > 0 ? needsReview : undefined,
    });
  }

  for (const tfType of ["aws_dynamodb_table", "aws_sqs_queue", "aws_sns_topic"] as const) {
    const info = resourceTypeInfo(tfType);
    if (!info) continue;
    for (const [name, instances] of Object.entries(getResourceBlocks(raw, tfType))) {
      concepts.push({
        id: name,
        type: info.label,
        awsResourceType: info.label,
        level: "container",
        parentId: ROOT_CONTEXT_ID,
        schema: schemaFromAttrs(instances[0] ?? {}, new Set()),
        groupId: null,
        sourceFiles,
      });
    }
  }

  return { concepts, groups, lambdaEnvVarBindings };
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm test -- terraform/scan-terraform.test.ts`
Expected: PASS (1 test).

- [x] **Step 6: Commit**

```bash
git add scripts/okf-scan/terraform/scan-terraform.ts scripts/okf-scan/terraform/scan-terraform.test.ts scripts/okf-scan/terraform/__fixtures__/env-scan
git commit -m "feat: extract Terraform resources into concept facts per environment"
```

---

## Milestone 3: Git freshness check & worktrees

### Task 10: `git ls-remote` wrapper

**Files:**
- Create: `scripts/okf-scan/git/ls-remote.ts`
- Test: `scripts/okf-scan/git/ls-remote.test.ts`

- [x] **Step 1: Install `simple-git`**

Run: `npm install simple-git`

- [x] **Step 2: Write the failing test**

This test builds a real throwaway local git repo (acting as the remote) with two branches, so the assertion is against real git behavior, not a mock.

```typescript
// scripts/okf-scan/git/ls-remote.test.ts
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import simpleGit from "simple-git";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRemoteBranchSha } from "./ls-remote";

describe("getRemoteBranchSha", () => {
  let repoDir: string;

  beforeEach(async () => {
    repoDir = await mkdtemp(path.join(tmpdir(), "okf-scan-lsremote-"));
    const git = simpleGit(repoDir);
    await git.init();
    await git.addConfig("user.email", "test@example.com");
    await git.addConfig("user.name", "Test");
    await writeFile(path.join(repoDir, "app.txt"), "main content\n");
    await git.add("./*");
    await git.commit("initial commit on main");
    await git.checkoutLocalBranch("develop");
    await writeFile(path.join(repoDir, "app.txt"), "develop content\n");
    await git.add("./*");
    await git.commit("commit on develop");
  });

  afterEach(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  it("returns the current commit SHA of the given branch without a clone", async () => {
    const git = simpleGit(repoDir);
    const expectedSha = (await git.revparse(["develop"])).trim();

    const sha = await getRemoteBranchSha(repoDir, "develop");

    expect(sha).toBe(expectedSha);
  });

  it("throws a descriptive error for a branch that doesn't exist", async () => {
    await expect(getRemoteBranchSha(repoDir, "does-not-exist")).rejects.toThrow(/does-not-exist/);
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npm test -- git/ls-remote.test.ts`
Expected: FAIL with "Cannot find module './ls-remote'"

- [x] **Step 4: Write the implementation**

```typescript
// scripts/okf-scan/git/ls-remote.ts
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
  const git = simpleGit(repoPath);
  const output = await git.listRemote(["--heads", repoPath, branch]);
  const line = output.trim().split("\n")[0];
  if (!line) {
    throw new Error(`branch "${branch}" not found for repo at ${repoPath}`);
  }
  return line.split("\t")[0];
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm test -- git/ls-remote.test.ts`
Expected: PASS (2 tests).

- [x] **Step 6: Commit**

```bash
git add scripts/okf-scan/git/ls-remote.ts scripts/okf-scan/git/ls-remote.test.ts package.json package-lock.json
git commit -m "feat: add git ls-remote wrapper for cheap repo freshness checks"
```

### Task 11: Repo-level freshness check

**Files:**
- Create: `scripts/okf-scan/check-repo-freshness.ts`
- Test: `scripts/okf-scan/check-repo-freshness.test.ts`

- [x] **Step 1: Write the failing test**

```typescript
// scripts/okf-scan/check-repo-freshness.test.ts
import { readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { hashContent } from "./hash";
import { parseTerraformDir } from "./terraform/hcl";
import type { RepoMapConfig, ScanManifest } from "./types";

vi.mock("./git/ls-remote", () => ({
  getRemoteBranchSha: vi.fn(async (repoPath: string) => {
    if (repoPath === "../orders-service") return "sha-orders-NEW";
    if (repoPath === "../web-storefront") return "sha-storefront-OLD";
    throw new Error(`unexpected repoPath ${repoPath}`);
  }),
}));

const { checkRepoFreshness } = await import("./check-repo-freshness");

const TF_FIXTURE_DIR = path.join(__dirname, "terraform", "__fixtures__", "env-scan");

async function currentTerraformHash(): Promise<string> {
  const entries = await readdir(TF_FIXTURE_DIR);
  const files = entries.filter((f) => f.endsWith(".tf") && f !== "hml.tf" && f !== "prd.tf").sort();
  const { fileContents } = await parseTerraformDir(TF_FIXTURE_DIR, files);
  return `sha256:${hashContent(files.map((f) => fileContents[f]).join("\n"))}`;
}

const config: RepoMapConfig = {
  terraform: { path: TF_FIXTURE_DIR, envFiles: { dev: "dev.tf", hml: "hml.tf", prd: "prd.tf" } },
  resources: {
    "aws_lambda_function.orders": {
      repo: "../orders-service",
      branch: { dev: "develop", hml: "staging", prd: "main" },
    },
  },
  frontend: [{ repo: "../web-storefront", branch: { dev: "develop", hml: "staging", prd: "main" } }],
};

describe("checkRepoFreshness", () => {
  it("flags only the repo whose ref changed since the manifest was last written", async () => {
    const manifest: ScanManifest = {
      _repos: {
        terraform: { lastScannedRef: await currentTerraformHash(), env: "dev" },
        "aws_lambda_function.orders": { lastScannedRef: "sha-orders-OLD", env: "dev" },
        "web-storefront": { lastScannedRef: "sha-storefront-OLD", env: "dev" },
      },
      concepts: {},
    };

    const results = await checkRepoFreshness(config, "dev", manifest);
    const changedKeys = results.filter((r) => r.changed).map((r) => r.ref.key);

    expect(changedKeys).toEqual(["aws_lambda_function.orders"]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- check-repo-freshness.test.ts`
Expected: FAIL with "Cannot find module './check-repo-freshness'"

- [x] **Step 3: Write the implementation**

```typescript
// scripts/okf-scan/check-repo-freshness.ts
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
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- check-repo-freshness.test.ts`
Expected: PASS (1 test).

- [x] **Step 5: Commit**

```bash
git add scripts/okf-scan/check-repo-freshness.ts scripts/okf-scan/check-repo-freshness.test.ts
git commit -m "feat: add repo-level freshness short-circuit before scanning"
```

### Task 12: Isolated worktree resolution

**Files:**
- Create: `scripts/okf-scan/git/worktree.ts`
- Test: `scripts/okf-scan/git/worktree.test.ts`

- [x] **Step 1: Write the failing test**

```typescript
// scripts/okf-scan/git/worktree.test.ts
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import simpleGit from "simple-git";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { syncWorktree, worktreePath } from "./worktree";

describe("syncWorktree", () => {
  let base: string;
  let upstreamDir: string;
  let localDir: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    base = await mkdtemp(path.join(tmpdir(), "okf-scan-worktree-"));
    upstreamDir = path.join(base, "upstream");
    localDir = path.join(base, "local");

    const upstream = simpleGit();
    await upstream.init(upstreamDir);
    const upstreamGit = simpleGit(upstreamDir);
    await upstreamGit.addConfig("user.email", "test@example.com");
    await upstreamGit.addConfig("user.name", "Test");
    await writeFile(path.join(upstreamDir, "app.txt"), "main content\n");
    await upstreamGit.add("./*");
    await upstreamGit.commit("initial commit on main");
    await upstreamGit.checkoutLocalBranch("develop");
    await writeFile(path.join(upstreamDir, "app.txt"), "develop content\n");
    await upstreamGit.add("./*");
    await upstreamGit.commit("commit on develop");
    await upstreamGit.checkout("main");

    await simpleGit().clone(upstreamDir, localDir);
    process.chdir(base);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(base, { recursive: true, force: true });
  });

  it("checks out the target branch into an isolated worktree without touching the local clone", async () => {
    const target = await syncWorktree(localDir, "orders-service", "develop", "dev");
    expect(target).toBe(worktreePath("orders-service", "dev"));

    const worktreeContent = await readFile(path.join(target, "app.txt"), "utf-8");
    expect(worktreeContent).toBe("develop content\n");

    const localBranch = (await simpleGit(localDir).branch()).current;
    expect(localBranch).toBe("main");
    const localContent = await readFile(path.join(localDir, "app.txt"), "utf-8");
    expect(localContent).toBe("main content\n");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- git/worktree.test.ts`
Expected: FAIL with "Cannot find module './worktree'"

- [x] **Step 3: Write the implementation**

```typescript
// scripts/okf-scan/git/worktree.ts
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
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- git/worktree.test.ts`
Expected: PASS (1 test).

- [x] **Step 5: Add the worktree cache dir to `.gitignore`**

Append to `.gitignore`:

```
.okf-scan-cache/
```

- [x] **Step 6: Commit**

```bash
git add scripts/okf-scan/git/worktree.ts scripts/okf-scan/git/worktree.test.ts .gitignore
git commit -m "feat: resolve per-environment branches into isolated git worktrees"
```

---

## Milestone 4: Code scanners (Lambda & frontend)

### Task 13: Shared TypeScript AST helpers

**Files:**
- Create: `scripts/okf-scan/code/ts-source.ts`
- Create: `scripts/okf-scan/code/__fixtures__/source-walk/included.ts`
- Create: `scripts/okf-scan/code/__fixtures__/source-walk/node_modules/skip-me.ts`
- Test: `scripts/okf-scan/code/ts-source.test.ts`

- [x] **Step 1: Add fixture files**

```typescript
// scripts/okf-scan/code/__fixtures__/source-walk/included.ts
export const add = (a: number, b: number) => a + b;
export const subtract = (a: number, b: number) => a - b;
```

```typescript
// scripts/okf-scan/code/__fixtures__/source-walk/node_modules/skip-me.ts
export const shouldNeverBeListed = true;
```

- [x] **Step 2: Write the failing test**

```typescript
// scripts/okf-scan/code/ts-source.test.ts
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { findDescendants, listSourceFiles, parseSourceFile } from "./ts-source";

const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "source-walk");

describe("listSourceFiles", () => {
  it("lists source files while skipping node_modules", async () => {
    const files = await listSourceFiles(FIXTURE_DIR);
    expect(files).toEqual([path.join(FIXTURE_DIR, "included.ts")]);
  });
});

describe("parseSourceFile + findDescendants", () => {
  it("finds every arrow function in the file", async () => {
    const source = await parseSourceFile(path.join(FIXTURE_DIR, "included.ts"));
    const arrows = findDescendants(source, ts.isArrowFunction);
    expect(arrows).toHaveLength(2);
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npm test -- code/ts-source.test.ts`
Expected: FAIL with "Cannot find module './ts-source'"

- [x] **Step 4: Write the implementation**

```typescript
// scripts/okf-scan/code/ts-source.ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next"]);

/** Recursively lists .ts/.tsx/.js/.jsx files under `dir`, skipping build/dependency directories. */
export async function listSourceFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(fullPath);
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) results.push(fullPath);
    }
  }
  await walk(dir);
  return results.sort();
}

/** Syntactic-only parse (no type checker, no Program) — enough for the AST shapes these scanners look for. */
export async function parseSourceFile(filePath: string): Promise<ts.SourceFile> {
  const text = await readFile(filePath, "utf-8");
  const scriptKind = filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, scriptKind);
}

/** Depth-first collection of every descendant node matching `test` (root included). */
export function findDescendants<T extends ts.Node>(root: ts.Node, test: (node: ts.Node) => node is T): T[] {
  const results: T[] = [];
  function visit(node: ts.Node): void {
    if (test(node)) results.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return results;
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm test -- code/ts-source.test.ts`
Expected: PASS (2 tests).

- [x] **Step 6: Commit**

```bash
git add scripts/okf-scan/code/ts-source.ts scripts/okf-scan/code/ts-source.test.ts scripts/okf-scan/code/__fixtures__/source-walk
git commit -m "feat: add shared TypeScript AST walking helpers"
```

### Task 14: Lambda repo scanner

Detects exported handlers and one hop of AWS SDK v3 `.send(new XCommand(...))` calls, resolving `process.env.X` targets against the Terraform env-var bindings `scan-terraform.ts` already produced. Literal-string targets (e.g. a hardcoded queue URL) and anything else it can't resolve go to `needsReview` rather than being guessed at — even though the spec allows literal-string resolution in principle, there's no reliable way yet to map an arbitrary literal onto a real concept id without extra cross-referencing, so this implementation is conservative on purpose.

**Files:**
- Create: `scripts/okf-scan/code/scan-lambda-repo.ts`
- Create: `scripts/okf-scan/code/__fixtures__/lambda-repo/handler.ts`
- Test: `scripts/okf-scan/code/scan-lambda-repo.test.ts`

- [x] **Step 1: Add the fixture Lambda handler**

```typescript
// scripts/okf-scan/code/__fixtures__/lambda-repo/handler.ts
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const ddb = new DynamoDBClient({});
const sqs = new SQSClient({});

export const handler = async (event: unknown) => {
  await ddb.send(new PutItemCommand({ TableName: process.env.ORDERS_TABLE, Item: {} }));
  await sqs.send(new SendMessageCommand({ QueueUrl: "https://literal-queue-url", MessageBody: "hi" }));
  return { statusCode: 200 };
};
```

- [x] **Step 2: Write the failing test**

```typescript
// scripts/okf-scan/code/scan-lambda-repo.test.ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanLambdaRepo } from "./scan-lambda-repo";

const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "lambda-repo");

describe("scanLambdaRepo", () => {
  it("finds the handler and resolves an env-var-bound SDK call to its Terraform target", async () => {
    const concepts = await scanLambdaRepo({
      repoDir: FIXTURE_DIR,
      containerId: "orders",
      envVarBindings: { ORDERS_TABLE: "aws_dynamodb_table.orders_table" },
    });

    expect(concepts).toHaveLength(1);
    const [handler] = concepts;
    expect(handler.id).toBe("orders/handler");
    expect(handler.level).toBe("component");
    expect(handler.parentId).toBe("orders");
    expect(handler.relations).toEqual([
      {
        targetId: "orders_table",
        kind: "sync",
        evidence: "PutItemCommand + env var ORDERS_TABLE bound in Terraform to aws_dynamodb_table.orders_table",
      },
    ]);
    expect(handler.needsReview).toEqual([
      'SendMessageCommand\'s QueueUrl is a literal value ("https://literal-queue-url") — not resolved to a concept id automatically',
    ]);
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npm test -- code/scan-lambda-repo.test.ts`
Expected: FAIL with "Cannot find module './scan-lambda-repo'"

- [x] **Step 4: Write the implementation**

```typescript
// scripts/okf-scan/code/scan-lambda-repo.ts
import path from "node:path";
import ts from "typescript";
import type { ConceptFacts, FactRelation } from "../types";
import { findDescendants, listSourceFiles, parseSourceFile } from "./ts-source";

const COMMAND_ARG_NAMES: Record<string, string> = {
  PutItemCommand: "TableName",
  GetItemCommand: "TableName",
  UpdateItemCommand: "TableName",
  DeleteItemCommand: "TableName",
  QueryCommand: "TableName",
  SendMessageCommand: "QueueUrl",
  PublishCommand: "TopicArn",
};

const ASYNC_COMMANDS = new Set(["SendMessageCommand", "PublishCommand"]);

type TargetValue =
  | { kind: "literal"; value: string }
  | { kind: "envVar"; name: string }
  | { kind: "unresolved"; raw: string };

interface SdkCall {
  commandName: string;
  argName: string;
  targetValue: TargetValue;
}

function isHandlerExport(node: ts.Node): node is ts.VariableStatement {
  if (!ts.isVariableStatement(node)) return false;
  const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  return isExported && node.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === "handler");
}

function extractObjectLiteralProp(obj: ts.ObjectLiteralExpression, propName: string): TargetValue | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name) || prop.name.text !== propName) continue;
    const init = prop.initializer;
    if (ts.isStringLiteral(init)) return { kind: "literal", value: init.text };
    if (
      ts.isPropertyAccessExpression(init) &&
      ts.isPropertyAccessExpression(init.expression) &&
      ts.isIdentifier(init.expression.expression) &&
      init.expression.expression.text === "process" &&
      init.expression.name.text === "env"
    ) {
      return { kind: "envVar", name: init.name.text };
    }
    return { kind: "unresolved", raw: init.getText() };
  }
  return undefined;
}

function findSdkCalls(root: ts.Node): SdkCall[] {
  const calls: SdkCall[] = [];
  for (const call of findDescendants(root, ts.isCallExpression)) {
    if (!ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== "send") continue;
    const [arg] = call.arguments;
    if (!arg || !ts.isNewExpression(arg) || !ts.isIdentifier(arg.expression)) continue;
    const commandName = arg.expression.text;
    const argName = COMMAND_ARG_NAMES[commandName];
    if (!argName) continue;
    const [commandArg] = arg.arguments ?? [];
    if (!commandArg || !ts.isObjectLiteralExpression(commandArg)) continue;
    const targetValue = extractObjectLiteralProp(commandArg, argName);
    if (!targetValue) continue;
    calls.push({ commandName, argName, targetValue });
  }
  return calls;
}

export interface LambdaScanContext {
  repoDir: string;
  /** the Terraform resource name this repo is mapped to, e.g. "orders" */
  containerId: string;
  /** env var name -> "tfType.tfName", from ScanResult.lambdaEnvVarBindings[containerId] */
  envVarBindings: Record<string, string>;
}

export async function scanLambdaRepo(ctx: LambdaScanContext): Promise<ConceptFacts[]> {
  const files = await listSourceFiles(ctx.repoDir);
  const concepts: ConceptFacts[] = [];

  for (const file of files) {
    const source = await parseSourceFile(file);
    if (findDescendants(source, isHandlerExport).length === 0) continue;

    const relations: FactRelation[] = [];
    const needsReview: string[] = [];

    for (const call of findSdkCalls(source)) {
      if (call.targetValue.kind === "envVar") {
        const binding = ctx.envVarBindings[call.targetValue.name];
        if (!binding) {
          needsReview.push(
            `${call.commandName} uses process.env.${call.targetValue.name}, which has no matching Terraform environment.variables binding`
          );
          continue;
        }
        relations.push({
          targetId: binding.split(".")[1],
          kind: ASYNC_COMMANDS.has(call.commandName) ? "async-event" : "sync",
          evidence: `${call.commandName} + env var ${call.targetValue.name} bound in Terraform to ${binding}`,
        });
        continue;
      }
      if (call.targetValue.kind === "literal") {
        needsReview.push(
          `${call.commandName}'s ${call.argName} is a literal value ("${call.targetValue.value}") — not resolved to a concept id automatically`
        );
        continue;
      }
      needsReview.push(`${call.commandName}'s ${call.argName} could not be resolved statically: ${call.targetValue.raw}`);
    }

    concepts.push({
      id: `${ctx.containerId}/${path.basename(file, path.extname(file))}`,
      type: "AWS Lambda Handler",
      level: "component",
      parentId: ctx.containerId,
      relations,
      sourceFiles: [file],
      needsReview: needsReview.length > 0 ? needsReview : undefined,
    });
  }

  return concepts;
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm test -- code/scan-lambda-repo.test.ts`
Expected: PASS (1 test).

- [x] **Step 6: Commit**

```bash
git add scripts/okf-scan/code/scan-lambda-repo.ts scripts/okf-scan/code/scan-lambda-repo.test.ts scripts/okf-scan/code/__fixtures__/lambda-repo
git commit -m "feat: scan Lambda repos for handlers and AWS SDK call relations"
```

### Task 15: Frontend repo scanner

**Files:**
- Create: `scripts/okf-scan/code/scan-frontend-repo.ts`
- Create: `scripts/okf-scan/code/__fixtures__/frontend-repo/CheckoutScreen.tsx`
- Test: `scripts/okf-scan/code/scan-frontend-repo.test.ts`

- [x] **Step 1: Add the fixture component**

```typescript
// scripts/okf-scan/code/__fixtures__/frontend-repo/CheckoutScreen.tsx
export function CheckoutScreen() {
  fetch("https://api.example.com/orders/123");
  fetch("https://unrelated-service.example.com/ping");
  return null;
}
```

- [x] **Step 2: Write the failing test**

```typescript
// scripts/okf-scan/code/scan-frontend-repo.test.ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanFrontendRepo } from "./scan-frontend-repo";

const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "frontend-repo");

describe("scanFrontendRepo", () => {
  it("finds an exported component and resolves a fetch() call against a known API base URL", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: { "https://api.example.com/orders": "orders_api" },
    });

    expect(concepts).toHaveLength(1);
    const [component] = concepts;
    expect(component.id).toBe("web-storefront/CheckoutScreen");
    expect(component.level).toBe("component");
    expect(component.relations).toEqual([
      {
        targetId: "orders_api",
        kind: "sync",
        evidence: 'fetch("https://api.example.com/orders/123") matches configured API base URL "https://api.example.com/orders"',
      },
    ]);
    expect(component.needsReview).toEqual([
      'fetch("https://unrelated-service.example.com/ping") does not match any known API base URL',
    ]);
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npm test -- code/scan-frontend-repo.test.ts`
Expected: FAIL with "Cannot find module './scan-frontend-repo'"

- [x] **Step 4: Write the implementation**

```typescript
// scripts/okf-scan/code/scan-frontend-repo.ts
import path from "node:path";
import ts from "typescript";
import type { ConceptFacts, FactRelation } from "../types";
import { findDescendants, listSourceFiles, parseSourceFile } from "./ts-source";

function isExportedComponent(node: ts.Node): node is ts.FunctionDeclaration | ts.VariableStatement {
  if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text)) {
    return node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  }
  if (ts.isVariableStatement(node)) {
    const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    return isExported && node.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && /^[A-Z]/.test(d.name.text));
  }
  return false;
}

function findFetchUrls(root: ts.Node): string[] {
  const urls: string[] = [];
  for (const call of findDescendants(root, ts.isCallExpression)) {
    if (!ts.isIdentifier(call.expression) || call.expression.text !== "fetch") continue;
    const [arg] = call.arguments;
    if (arg && ts.isStringLiteral(arg)) urls.push(arg.text);
  }
  return urls;
}

export interface FrontendScanContext {
  repoDir: string;
  containerId: string;
  /** URL prefix -> target concept id, e.g. { "https://api.example.com/orders": "orders_api" } */
  apiBaseUrls: Record<string, string>;
}

export async function scanFrontendRepo(ctx: FrontendScanContext): Promise<ConceptFacts[]> {
  const files = await listSourceFiles(ctx.repoDir);
  const concepts: ConceptFacts[] = [];

  for (const file of files) {
    const source = await parseSourceFile(file);
    if (findDescendants(source, isExportedComponent).length === 0) continue;

    const relations: FactRelation[] = [];
    const needsReview: string[] = [];

    for (const url of findFetchUrls(source)) {
      const baseUrl = Object.keys(ctx.apiBaseUrls).find((prefix) => url.startsWith(prefix));
      if (!baseUrl) {
        needsReview.push(`fetch("${url}") does not match any known API base URL`);
        continue;
      }
      relations.push({
        targetId: ctx.apiBaseUrls[baseUrl],
        kind: "sync",
        evidence: `fetch("${url}") matches configured API base URL "${baseUrl}"`,
      });
    }

    concepts.push({
      id: `${ctx.containerId}/${path.basename(file, path.extname(file))}`,
      type: "React Component",
      level: "component",
      parentId: ctx.containerId,
      relations,
      sourceFiles: [file],
      needsReview: needsReview.length > 0 ? needsReview : undefined,
    });
  }

  return concepts;
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm test -- code/scan-frontend-repo.test.ts`
Expected: PASS (1 test).

- [x] **Step 6: Commit**

```bash
git add scripts/okf-scan/code/scan-frontend-repo.ts scripts/okf-scan/code/scan-frontend-repo.test.ts scripts/okf-scan/code/__fixtures__/frontend-repo
git commit -m "feat: scan frontend repos for components and API-call relations"
```

## Milestone 5: Ownership

### Task 16: CODEOWNERS parsing

**Files:**
- Create: `scripts/okf-scan/code/codeowners.ts`
- Create: `scripts/okf-scan/code/__fixtures__/codeowners-repo/CODEOWNERS`
- Test: `scripts/okf-scan/code/codeowners.test.ts`

- [x] **Step 1: Add the fixture CODEOWNERS file**

```
# scripts/okf-scan/code/__fixtures__/codeowners-repo/CODEOWNERS
*            @platform-team
/src/orders/ @orders-team
```

- [x] **Step 2: Write the failing test**

```typescript
// scripts/okf-scan/code/codeowners.test.ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ownerForFile } from "./codeowners";

const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "codeowners-repo");

describe("ownerForFile", () => {
  it("uses the most specific matching rule (last match wins, matching GitHub's own precedence)", async () => {
    const ordersOwner = await ownerForFile(FIXTURE_DIR, path.join(FIXTURE_DIR, "src", "orders", "handler.ts"));
    expect(ordersOwner).toBe("orders-team");

    const fallbackOwner = await ownerForFile(FIXTURE_DIR, path.join(FIXTURE_DIR, "src", "other", "file.ts"));
    expect(fallbackOwner).toBe("platform-team");
  });

  it("returns undefined when there is no CODEOWNERS file", async () => {
    const owner = await ownerForFile(path.join(FIXTURE_DIR, "..", "lambda-repo"), path.join(FIXTURE_DIR, "handler.ts"));
    expect(owner).toBeUndefined();
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npm test -- code/codeowners.test.ts`
Expected: FAIL with "Cannot find module './codeowners'"

- [x] **Step 4: Write the implementation**

```typescript
// scripts/okf-scan/code/codeowners.ts
import { readFile } from "node:fs/promises";
import path from "node:path";

interface OwnerRule {
  pattern: string;
  owner: string;
}

const CODEOWNERS_LOCATIONS = ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"];

async function readCodeowners(repoDir: string): Promise<OwnerRule[]> {
  for (const candidate of CODEOWNERS_LOCATIONS) {
    try {
      const text = await readFile(path.join(repoDir, candidate), "utf-8");
      return text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))
        .map((line) => {
          const [pattern, ...owners] = line.split(/\s+/);
          return { pattern, owner: owners[0]?.replace(/^@/, "") ?? "" };
        })
        .filter((rule): rule is OwnerRule => rule.owner.length > 0);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
  return [];
}

/** Loosely matches CODEOWNERS glob patterns: `*`, extension globs, and directory prefixes. */
function matchesPattern(relativePath: string, pattern: string): boolean {
  if (pattern === "*") return true;
  const normalized = pattern.replace(/^\//, "");
  if (normalized.endsWith("/")) return relativePath.startsWith(normalized);
  if (normalized.startsWith("*.")) return relativePath.endsWith(normalized.slice(1));
  return relativePath === normalized || relativePath.startsWith(`${normalized}/`);
}

/** Last matching rule wins, same precedence GitHub's own CODEOWNERS resolution uses. */
export async function ownerForFile(repoDir: string, filePath: string): Promise<string | undefined> {
  const rules = await readCodeowners(repoDir);
  const relativePath = path.relative(repoDir, filePath).split(path.sep).join("/");
  let owner: string | undefined;
  for (const rule of rules) {
    if (matchesPattern(relativePath, rule.pattern)) owner = rule.owner;
  }
  return owner;
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm test -- code/codeowners.test.ts`
Expected: PASS (2 tests).

- [x] **Step 6: Commit**

```bash
git add scripts/okf-scan/code/codeowners.ts scripts/okf-scan/code/codeowners.test.ts scripts/okf-scan/code/__fixtures__/codeowners-repo
git commit -m "feat: derive concept ownership from CODEOWNERS"
```

---

## Milestone 6: Synthesis

The bundle's directory convention mirrors `public/okf-bundles/order-system/`: a top-level container concept lives at `<id>.md`; its children live under `<id>/`. A concept's id (e.g. `"orders/handler"`) is literally its file path minus `.md`, so relation links between concepts are computed generically from the two ids via `path.posix.relative`.

### Task 17: OKF markdown read/write/merge

**Files:**
- Create: `scripts/okf-scan/synthesize/markdown.ts`
- Test: `scripts/okf-scan/synthesize/markdown.test.ts`

- [x] **Step 1: Write the failing test**

```typescript
// scripts/okf-scan/synthesize/markdown.test.ts
import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "../../../src/lib/frontmatter";
import type { ConceptFacts, GroupFact } from "../types";
import { buildConceptMarkdown, readPreserved, relativeLinkFromTo, titleize } from "./markdown";

describe("titleize", () => {
  it("converts a snake_case leaf id into a title, using only the last path segment", () => {
    expect(titleize("orders_table")).toBe("Orders Table");
    expect(titleize("orders/handler")).toBe("Handler");
  });
});

describe("relativeLinkFromTo", () => {
  it("links between two top-level concepts", () => {
    expect(relativeLinkFromTo("orders", "orders_table")).toBe("orders_table.md");
  });

  it("links from a child concept up to a top-level concept", () => {
    expect(relativeLinkFromTo("orders/handler", "orders_table")).toBe("../orders_table.md");
  });

  it("links from a top-level concept down to its own child", () => {
    expect(relativeLinkFromTo("orders", "orders/handler")).toBe("orders/handler.md");
  });
});

describe("readPreserved", () => {
  it("extracts ddd_context and Links from an existing file, ignoring everything else", () => {
    const existing = [
      "---",
      "type: AWS Lambda Function",
      "title: Orders",
      "ddd_context: Orders",
      "---",
      "",
      "Old prose that will be replaced.",
      "",
      "# Links",
      "",
      "- [Repository](https://github.com/example/orders)",
    ].join("\n");

    const preserved = readPreserved(existing);
    expect(preserved.ddd_context).toBe("Orders");
    expect(preserved.links).toEqual([{ label: "Repository", url: "https://github.com/example/orders" }]);
  });

  it("returns no ddd fields and no links when there is no existing file", () => {
    expect(readPreserved(null)).toEqual({ links: [] });
  });
});

describe("buildConceptMarkdown", () => {
  const facts: ConceptFacts = {
    id: "orders",
    type: "AWS Lambda Function",
    awsResourceType: "AWS Lambda Function",
    level: "container",
    parentId: "platform",
    schema: { memory_size: 512 },
    relations: [{ targetId: "orders_table", kind: "sync", evidence: "PutItemCommand" }],
    sourceFiles: [],
  };

  it("writes frontmatter, prose, schema, and a relation link using the target's title", () => {
    const markdown = buildConceptMarkdown({
      facts,
      prose: "Handles incoming orders.",
      preserved: { links: [] },
      conceptTitles: { orders_table: "Orders Table" },
      groups: [],
    });

    const { data, content } = parseFrontmatter(markdown);
    expect(data.type).toBe("AWS Lambda Function");
    expect(data.level).toBe("container");
    expect(content).toContain("Handles incoming orders.");
    expect(content).toContain("- memory_size: 512");
    expect(content).toContain("[Orders Table](orders_table.md) — PutItemCommand {kind: sync}");
  });

  it("preserves a hand-added ddd_context and Links section across regeneration", () => {
    const markdown = buildConceptMarkdown({
      facts,
      prose: "Handles incoming orders.",
      preserved: { ddd_context: "Orders", links: [{ label: "Repository", url: "https://github.com/example/orders" }] },
      conceptTitles: { orders_table: "Orders Table" },
      groups: [],
    });

    const { data, content } = parseFrontmatter(markdown);
    expect(data.ddd_context).toBe("Orders");
    expect(content).toContain("[Repository](https://github.com/example/orders)");
  });

  it("writes a group frontmatter link resolved through the group's parentGroupId nesting", () => {
    const groups: GroupFact[] = [
      { id: "vpc-main", kind: "vpc", name: "main", parentGroupId: null },
      { id: "subnet-private_a", kind: "subnet", name: "private_a", parentGroupId: "vpc-main", subnetType: "private" },
    ];
    const markdown = buildConceptMarkdown({
      facts: { ...facts, groupId: "subnet-private_a" },
      prose: "Handles incoming orders.",
      preserved: { links: [] },
      conceptTitles: { orders_table: "Orders Table" },
      groups,
    });

    const { data } = parseFrontmatter(markdown);
    expect(data.group).toBe("groups/vpc-main/subnet-private_a.md");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- synthesize/markdown.test.ts`
Expected: FAIL with "Cannot find module './markdown'"

- [x] **Step 3: Write the implementation**

```typescript
// scripts/okf-scan/synthesize/markdown.ts
import path from "node:path/posix";
import { parseFrontmatter, type Frontmatter } from "../../../src/lib/frontmatter";
import type { ConceptFacts, GroupFact } from "../types";

/** Leaf-segment id -> Title Case, e.g. "orders/handler" -> "Handler". */
export function titleize(id: string): string {
  const last = id.split("/").pop() ?? id;
  return last.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeLinkToPath(sourceId: string, targetPath: string): string {
  const sourceDir = path.dirname(sourceId);
  const fromDir = sourceDir === "." ? "" : sourceDir;
  return path.relative(fromDir, targetPath);
}

/**
 * A concept's id doubles as its file path minus `.md` (e.g. "orders/handler"
 * -> "orders/handler.md"), so the markdown link from one concept to another
 * is just a relative-path computation between the two ids.
 */
export function relativeLinkFromTo(sourceId: string, targetId: string): string {
  return relativeLinkToPath(sourceId, `${targetId}.md`);
}

/**
 * A group's bundle-relative path depends on its parentGroupId chain (each
 * level nests in its own directory, matching writeGroupFiles/okf-import.ts's
 * convention), unlike a concept id, which already *is* its own path.
 */
export function groupBundlePath(groups: GroupFact[], groupId: string): string {
  const byId = new Map(groups.map((g) => [g.id, g]));
  const segments: string[] = [];
  let current = byId.get(groupId);
  while (current) {
    segments.unshift(current.id);
    current = current.parentGroupId ? byId.get(current.parentGroupId) : undefined;
  }
  return `groups/${segments.join("/")}.md`;
}

export function relativeGroupLink(sourceId: string, groups: GroupFact[], groupId: string): string {
  return relativeLinkToPath(sourceId, groupBundlePath(groups, groupId));
}

function stringifyFrontmatter(data: Frontmatter): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      value.forEach((item) => lines.push(`  - ${item}`));
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function buildSchemaSection(schema: Record<string, string | number | boolean> | undefined): string {
  if (!schema || Object.keys(schema).length === 0) return "";
  const lines = Object.entries(schema).map(([key, value]) => `- ${key}: ${value}`);
  return ["# Schema", "", ...lines].join("\n");
}

function buildRelationsSection(facts: ConceptFacts, conceptTitles: Record<string, string>): string {
  if (!facts.relations || facts.relations.length === 0) return "";
  const lines = facts.relations.map((rel) => {
    const suffix = rel.kind ? ` {kind: ${rel.kind}}` : "";
    const linkText = conceptTitles[rel.targetId] ?? rel.targetId;
    const linkPath = relativeLinkFromTo(facts.id, rel.targetId);
    return `- [${linkText}](${linkPath}) — ${rel.label ?? rel.evidence}${suffix}`;
  });
  return ["# Relations", "", ...lines].join("\n");
}

function buildLinksSection(links: { label: string; url: string }[]): string {
  if (links.length === 0) return "";
  return ["# Links", "", ...links.map((l) => `- [${l.label}](${l.url})`)].join("\n");
}

export interface ExistingConceptFile {
  ddd_subdomain?: string;
  ddd_context?: string;
  ddd_role?: string;
  links: { label: string; url: string }[];
}

/** Reads whatever ddd_*/Links data a previously-generated file has, so a re-scan doesn't discard hand curation. */
export function readPreserved(existingRaw: string | null): ExistingConceptFile {
  if (!existingRaw) return { links: [] };
  const { data, content } = parseFrontmatter(existingRaw);
  const linksSection = content.split(/\n(?=# )/).find((s) => s.trim().startsWith("# Links"));
  const links: { label: string; url: string }[] = [];
  if (linksSection) {
    const re = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(linksSection))) links.push({ label: m[1], url: m[2] });
  }
  return {
    ddd_subdomain: typeof data.ddd_subdomain === "string" ? data.ddd_subdomain : undefined,
    ddd_context: typeof data.ddd_context === "string" ? data.ddd_context : undefined,
    ddd_role: typeof data.ddd_role === "string" ? data.ddd_role : undefined,
    links,
  };
}

export interface BuildConceptMarkdownOptions {
  facts: ConceptFacts;
  prose: string;
  preserved: ExistingConceptFile;
  /** id -> display title, for writing readable relation link text */
  conceptTitles: Record<string, string>;
  /** every group in the bundle, needed to resolve facts.groupId into a `group:` frontmatter link */
  groups: GroupFact[];
}

export function buildConceptMarkdown(options: BuildConceptMarkdownOptions): string {
  const { facts, prose, preserved, conceptTitles, groups } = options;
  const frontmatter: Frontmatter = {
    type: facts.type,
    title: titleize(facts.id),
    description: prose.split("\n\n")[0] ?? "",
    level: facts.level,
  };
  if (facts.awsResourceType) frontmatter.aws_resource_type = facts.awsResourceType;
  if (facts.groupId) frontmatter.group = relativeGroupLink(facts.id, groups, facts.groupId);
  if (facts.owner) frontmatter.owner = facts.owner;
  if (preserved.ddd_subdomain) frontmatter.ddd_subdomain = preserved.ddd_subdomain;
  if (preserved.ddd_context) frontmatter.ddd_context = preserved.ddd_context;
  if (preserved.ddd_role) frontmatter.ddd_role = preserved.ddd_role;

  const sections = [
    prose,
    buildSchemaSection(facts.schema),
    buildRelationsSection(facts, conceptTitles),
    buildLinksSection(preserved.links),
  ].filter((s) => s.length > 0);

  return `${stringifyFrontmatter(frontmatter)}\n\n${sections.join("\n\n")}\n`;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- synthesize/markdown.test.ts`
Expected: PASS (9 tests).

- [x] **Step 5: Commit**

```bash
git add scripts/okf-scan/synthesize/markdown.ts scripts/okf-scan/synthesize/markdown.test.ts
git commit -m "feat: add OKF concept markdown writer with ddd/Links-preserving merge"
```

### Task 18: LLM prose client

**Files:**
- Create: `scripts/okf-scan/synthesize/llm.ts`
- Test: `scripts/okf-scan/synthesize/llm.test.ts`

- [x] **Step 1: Install `@anthropic-ai/sdk`**

Run: `npm install @anthropic-ai/sdk`

- [x] **Step 2: Write the failing test**

```typescript
// scripts/okf-scan/synthesize/llm.test.ts
import { describe, expect, it, vi } from "vitest";
import type { ConceptFacts } from "../types";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class FakeAPIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  class FakeAnthropic {
    messages = { create: createMock };
    static APIError = FakeAPIError;
  }
  return { default: FakeAnthropic };
});

const { createAnthropicLlmClient } = await import("./llm");
const AnthropicModule = (await import("@anthropic-ai/sdk")).default as unknown as {
  APIError: new (status: number, message: string) => Error;
};

const facts: ConceptFacts = {
  id: "orders_table",
  type: "Amazon DynamoDB Table",
  level: "container",
  parentId: "platform",
  sourceFiles: [],
};

describe("createAnthropicLlmClient", () => {
  it("returns the trimmed text content from a successful call", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: "  A DynamoDB table.  " }] });

    const client = createAnthropicLlmClient("fake-key");
    const prose = await client.describeConcept(facts);

    expect(prose).toBe("A DynamoDB table.");
  });

  it("retries once on a 429 rate-limit error and then succeeds", async () => {
    createMock.mockReset();
    createMock
      .mockRejectedValueOnce(new AnthropicModule.APIError(429, "rate limited"))
      .mockResolvedValueOnce({ content: [{ type: "text", text: "Recovered." }] });

    const client = createAnthropicLlmClient("fake-key");
    const prose = await client.describeConcept(facts);

    expect(prose).toBe("Recovered.");
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("throws immediately when no API key is available", () => {
    expect(() => createAnthropicLlmClient(undefined)).toThrow(/ANTHROPIC_API_KEY/);
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npm test -- synthesize/llm.test.ts`
Expected: FAIL with "Cannot find module './llm'"

- [x] **Step 4: Write the implementation**

```typescript
// scripts/okf-scan/synthesize/llm.ts
import Anthropic from "@anthropic-ai/sdk";
import type { ConceptFacts } from "../types";

const MODEL = "claude-sonnet-5";
const MAX_ATTEMPTS = 3;

function buildPrompt(facts: ConceptFacts): string {
  return [
    "You are writing one OKF concept document body for an architecture diagram tool.",
    `Concept id: ${facts.id}`,
    `Type: ${facts.type}`,
    facts.awsResourceType ? `AWS resource type: ${facts.awsResourceType}` : "",
    facts.schema ? `Schema:\n${JSON.stringify(facts.schema, null, 2)}` : "",
    facts.relations?.length
      ? `Known relations (already extracted — do not invent any others):\n${facts.relations
          .map((r) => `- ${r.targetId}: ${r.evidence}`)
          .join("\n")}`
      : "",
    "",
    "Write 1-3 short paragraphs of plain prose describing what this concept is and how it's used, grounded only in the facts above. Do not invent fields, relations, or capabilities not listed. Do not include a heading or any markdown section markers — just the prose paragraphs.",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface LlmClient {
  describeConcept(facts: ConceptFacts): Promise<string>;
}

export function createAnthropicLlmClient(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY): LlmClient {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required to generate concept prose");
  const client = new Anthropic({ apiKey });

  return {
    async describeConcept(facts: ConceptFacts): Promise<string> {
      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const response = await client.messages.create({
            model: MODEL,
            max_tokens: 400,
            messages: [{ role: "user", content: buildPrompt(facts) }],
          });
          const textBlock = response.content.find((block) => block.type === "text");
          if (!textBlock || textBlock.type !== "text") throw new Error("LLM response had no text content");
          return textBlock.text.trim();
        } catch (err) {
          lastError = err;
          const isRateLimit = err instanceof Anthropic.APIError && err.status === 429;
          if (!isRateLimit || attempt === MAX_ATTEMPTS - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500));
        }
      }
      throw lastError;
    },
  };
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm test -- synthesize/llm.test.ts`
Expected: PASS (3 tests). Note the retry test takes ~0.5s of real wall-clock time (the backoff delay) — acceptable for one test, not worth the complexity of injecting a fake clock here.

- [x] **Step 6: Commit**

```bash
git add scripts/okf-scan/synthesize/llm.ts scripts/okf-scan/synthesize/llm.test.ts package.json package-lock.json
git commit -m "feat: add Claude-backed LLM prose client with 429 retry"
```

### Task 19: Synthesis orchestration with incremental skip

**Files:**
- Create: `scripts/okf-scan/synthesize/synthesize.ts`
- Test: `scripts/okf-scan/synthesize/synthesize.test.ts`

- [x] **Step 1: Write the failing test**

```typescript
// scripts/okf-scan/synthesize/synthesize.test.ts
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ConceptFacts, ScanResult } from "../types";
import type { LlmClient } from "./llm";
import { synthesize } from "./synthesize";

function fakeLlm(): { client: LlmClient; calls: ConceptFacts[] } {
  const calls: ConceptFacts[] = [];
  return {
    calls,
    client: {
      async describeConcept(facts) {
        calls.push(facts);
        return `Prose for ${facts.id}.`;
      },
    },
  };
}

function scanResultWith(ordersMemorySize: number): ScanResult {
  return {
    groups: [],
    lambdaEnvVarBindings: {},
    concepts: [
      {
        id: "orders",
        type: "AWS Lambda Function",
        awsResourceType: "AWS Lambda Function",
        level: "container",
        parentId: "platform",
        schema: { memory_size: ordersMemorySize },
        sourceFiles: [],
      },
      {
        id: "orders_table",
        type: "Amazon DynamoDB Table",
        awsResourceType: "Amazon DynamoDB Table",
        level: "container",
        parentId: "platform",
        schema: { billing_mode: "PAY_PER_REQUEST" },
        sourceFiles: [],
      },
    ],
  };
}

describe("synthesize", () => {
  let bundleDir: string;

  beforeEach(async () => {
    bundleDir = await mkdtemp(path.join(tmpdir(), "okf-scan-synthesize-"));
  });

  afterEach(async () => {
    await rm(bundleDir, { recursive: true, force: true });
  });

  it("generates a file per concept and calls the LLM once per concept", async () => {
    const { client, calls } = fakeLlm();
    const summary = await synthesize({ scanResult: scanResultWith(512), bundleDir, llm: client });

    expect(summary.written.sort()).toEqual(["orders", "orders_table"]);
    expect(calls.map((f) => f.id).sort()).toEqual(["orders", "orders_table"]);

    const ordersContent = await readFile(path.join(bundleDir, "orders.md"), "utf-8");
    expect(ordersContent).toContain("Prose for orders.");
    expect(ordersContent).toContain("- memory_size: 512");
  });

  it("skips unchanged concepts on a re-run, and regenerates only the one whose facts changed, preserving its hand-added ddd_context", async () => {
    const { client: llm1 } = fakeLlm();
    await synthesize({ scanResult: scanResultWith(512), bundleDir, llm: llm1 });
    const ordersTableBefore = await readFile(path.join(bundleDir, "orders_table.md"), "utf-8");

    const { client: llm2, calls: calls2 } = fakeLlm();
    const summary2 = await synthesize({ scanResult: scanResultWith(512), bundleDir, llm: llm2 });
    expect(calls2).toHaveLength(0);
    expect(summary2.skipped.sort()).toEqual(["orders", "orders_table"]);
    expect(await readFile(path.join(bundleDir, "orders_table.md"), "utf-8")).toBe(ordersTableBefore);

    const ordersBefore = await readFile(path.join(bundleDir, "orders.md"), "utf-8");
    await writeFile(
      path.join(bundleDir, "orders.md"),
      ordersBefore.replace("level: container", "level: container\nddd_context: Orders")
    );

    const { client: llm3, calls: calls3 } = fakeLlm();
    const summary3 = await synthesize({ scanResult: scanResultWith(1024), bundleDir, llm: llm3 });
    expect(summary3.written).toEqual(["orders"]);
    expect(summary3.skipped).toEqual(["orders_table"]);
    expect(calls3.map((f) => f.id)).toEqual(["orders"]);

    const ordersAfter = await readFile(path.join(bundleDir, "orders.md"), "utf-8");
    expect(ordersAfter).toContain("- memory_size: 1024");
    expect(ordersAfter).toContain("ddd_context: Orders");
    expect(await readFile(path.join(bundleDir, "orders_table.md"), "utf-8")).toBe(ordersTableBefore);
  });

  it("writes a per-container index.md listing its component children, so okf-import.ts's directory walk can discover them", async () => {
    const scanResult: ScanResult = {
      groups: [],
      lambdaEnvVarBindings: {},
      concepts: [
        { id: "orders", type: "AWS Lambda Function", level: "container", parentId: "platform", sourceFiles: [] },
        { id: "orders/handler", type: "AWS Lambda Handler", level: "component", parentId: "orders", sourceFiles: [] },
      ],
    };
    const { client } = fakeLlm();
    await synthesize({ scanResult, bundleDir, llm: client });

    const childIndex = await readFile(path.join(bundleDir, "orders", "index.md"), "utf-8");
    expect(childIndex).toContain("[Handler](handler.md)");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- synthesize/synthesize.test.ts`
Expected: FAIL with "Cannot find module './synthesize'"

- [x] **Step 3: Write the implementation**

```typescript
// scripts/okf-scan/synthesize/synthesize.ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { mapWithConcurrency } from "../concurrency";
import { hashJson } from "../hash";
import { loadManifest, saveManifest } from "../manifest";
import { emptyManifest, ROOT_CONTEXT_ID, type ConceptFacts, type GroupFact, type ScanManifest, type ScanResult } from "../types";
import { buildConceptMarkdown, readPreserved, titleize } from "./markdown";
import type { LlmClient } from "./llm";

export interface SynthesizeOptions {
  scanResult: ScanResult;
  bundleDir: string;
  llm: LlmClient;
  force?: boolean;
  /** max concurrent LLM prose calls; the rate-limit-bound stage, so this stays low by default */
  concurrency?: number;
  now?: () => string;
}

export interface SynthesizeSummary {
  written: string[];
  skipped: string[];
  needsReview: { id: string; notes: string[] }[];
}

async function readIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

function conceptFilePath(bundleDir: string, id: string): string {
  return path.join(bundleDir, `${id}.md`);
}

export async function synthesize(options: SynthesizeOptions): Promise<SynthesizeSummary> {
  const { scanResult, bundleDir, llm, force = false, concurrency = 6, now = () => new Date().toISOString() } = options;
  const manifest: ScanManifest = force ? emptyManifest() : await loadManifest(bundleDir);
  const summary: SynthesizeSummary = { written: [], skipped: [], needsReview: [] };

  const conceptTitles: Record<string, string> = {};
  for (const concept of scanResult.concepts) conceptTitles[concept.id] = titleize(concept.id);

  const toRegenerate: { facts: ConceptFacts; inputHash: string }[] = [];
  for (const facts of scanResult.concepts) {
    if (facts.needsReview?.length) summary.needsReview.push({ id: facts.id, notes: facts.needsReview });

    const inputHash = hashJson(facts);
    const previous = manifest.concepts[facts.id];
    if (!force && previous?.inputHash === inputHash) {
      summary.skipped.push(facts.id);
      continue;
    }
    toRegenerate.push({ facts, inputHash });
  }

  // The LLM prose call is the expensive, rate-limit-bound step, so only this
  // part runs with bounded concurrency — everything else here is local fs I/O.
  const regenerated = await mapWithConcurrency(toRegenerate, concurrency, async ({ facts, inputHash }) => {
    const filePath = conceptFilePath(bundleDir, facts.id);
    const preserved = readPreserved(await readIfExists(filePath));
    const prose = await llm.describeConcept(facts);
    const markdown = buildConceptMarkdown({ facts, prose, preserved, conceptTitles, groups: scanResult.groups });
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, markdown, "utf-8");
    return { id: facts.id, inputHash, facts };
  });

  for (const result of regenerated) {
    manifest.concepts[result.id] = { inputHash: result.inputHash, facts: result.facts, lastScannedAt: now() };
    summary.written.push(result.id);
  }

  await writeRootFiles(bundleDir, scanResult, conceptTitles);
  await writeChildIndexes(bundleDir, scanResult, conceptTitles);
  await saveManifest(bundleDir, manifest);
  return summary;
}

/**
 * A component concept's id (e.g. "orders/handler") already puts its file at
 * the right path (bundleDir/orders/handler.md), but okf-import.ts only
 * discovers files it can reach by walking index.md links — it never lists a
 * directory directly. Without a sibling "orders/index.md" bullet-listing
 * "handler.md", the component would exist on disk but never load into the
 * model at all.
 */
async function writeChildIndexes(bundleDir: string, scanResult: ScanResult, conceptTitles: Record<string, string>): Promise<void> {
  const childrenByContainer = new Map<string, ConceptFacts[]>();
  for (const facts of scanResult.concepts) {
    if (!facts.id.includes("/")) continue;
    const containerId = facts.id.slice(0, facts.id.lastIndexOf("/"));
    childrenByContainer.set(containerId, [...(childrenByContainer.get(containerId) ?? []), facts]);
  }

  for (const [containerId, children] of childrenByContainer) {
    const lines = ["---", `title: ${conceptTitles[containerId] ?? titleize(containerId)}`, "---", "", "# Concepts", ""];
    for (const child of children) {
      const leafName = child.id.split("/").pop()!;
      lines.push(`- [${conceptTitles[child.id]}](${leafName}.md) - ${child.type}`);
    }
    await mkdir(path.join(bundleDir, containerId), { recursive: true });
    await writeFile(path.join(bundleDir, containerId, "index.md"), `${lines.join("\n")}\n`, "utf-8");
  }
}

async function writeRootFiles(bundleDir: string, scanResult: ScanResult, conceptTitles: Record<string, string>): Promise<void> {
  await mkdir(bundleDir, { recursive: true });

  const platformLines = ["---", "type: Software System", "title: Platform", "level: context", "---", "", "Generated by scripts/okf-scan."];
  await writeFile(path.join(bundleDir, "platform.md"), `${platformLines.join("\n")}\n`, "utf-8");

  const topLevel = scanResult.concepts.filter((c) => c.parentId === ROOT_CONTEXT_ID);
  const conceptLinks = topLevel.map((c) => `- [${conceptTitles[c.id]}](${c.id}.md) - ${c.type}`);
  const groupsLink =
    scanResult.groups.length > 0
      ? ["", "# Groups", "", "- [AWS Network Groups](groups/index.md) - region/VPC/AZ/subnet boundaries"]
      : [];

  const indexLines = [
    "---",
    'title: "Generated Architecture"',
    "---",
    "",
    "# Concepts",
    "",
    "- [Platform](platform.md) - root system node",
    ...conceptLinks,
    ...groupsLink,
  ];
  await writeFile(path.join(bundleDir, "index.md"), `${indexLines.join("\n")}\n`, "utf-8");

  if (scanResult.groups.length > 0) await writeGroupFiles(bundleDir, scanResult.groups);
}

/** Mirrors the nested directory-per-level convention okf-import.ts expects: a group's children live in `<groupId>/`, sibling to `<groupId>.md`. */
async function writeGroupFiles(bundleDir: string, groups: GroupFact[]): Promise<void> {
  const byParent = new Map<string | null, GroupFact[]>();
  for (const group of groups) {
    const key = group.parentGroupId ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), group]);
  }

  async function writeLevel(dir: string, parentKey: string | null): Promise<void> {
    const children = byParent.get(parentKey) ?? [];
    await mkdir(dir, { recursive: true });
    const indexLines = ["---", "title: AWS Network Groups", "---", "", "# Concepts", ""];
    for (const group of children) indexLines.push(`- [${group.name}](${group.id}.md) - ${group.kind}`);
    await writeFile(path.join(dir, "index.md"), `${indexLines.join("\n")}\n`, "utf-8");

    for (const group of children) {
      const lines = ["---", `title: ${group.name}`, `kind: ${group.kind}`];
      if (group.subnetType) lines.push(`subnet_type: ${group.subnetType}`);
      lines.push("---", "");
      await writeFile(path.join(dir, `${group.id}.md`), `${lines.join("\n")}\n`, "utf-8");

      if ((byParent.get(group.id) ?? []).length > 0) await writeLevel(path.join(dir, group.id), group.id);
    }
  }

  await writeLevel(path.join(bundleDir, "groups"), null);
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- synthesize/synthesize.test.ts`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add scripts/okf-scan/synthesize/synthesize.ts scripts/okf-scan/synthesize/synthesize.test.ts
git commit -m "feat: orchestrate incremental OKF synthesis from scan facts"
```

---

## Milestone 7: CLI wiring & end-to-end verification

### Task 20: CLI entrypoint

Wires every prior milestone together: freshness check → worktrees (changed repos only) → scanners → synthesis. The argument-parsing logic (`parseArgs`) is pure and gets a unit test; the full `main()` orchestration touches git, the filesystem, and the LLM API, so it's verified manually against the fixtures in Step 6 instead of mocked into a brittle unit test — every stage it calls already has its own real test coverage from Tasks 7-19.

**Files:**
- Create: `scripts/okf-scan/index.ts`
- Test: `scripts/okf-scan/index.test.ts`
- Modify: `package.json`

- [x] **Step 1: Write the failing test for `parseArgs`**

```typescript
// scripts/okf-scan/index.test.ts
import { describe, expect, it } from "vitest";
import { parseArgs } from "./index";

describe("parseArgs", () => {
  it("parses required flags and applies concurrency defaults", () => {
    const args = parseArgs(["--repo-map", "repo-map.yaml", "--env", "dev", "--out", "public/okf-bundles/ecommerce-dev"]);
    expect(args).toEqual({
      repoMap: "repo-map.yaml",
      env: "dev",
      out: "public/okf-bundles/ecommerce-dev",
      force: false,
      concurrencyGit: 20,
      concurrencyScan: 4,
      concurrencyLlm: 6,
    });
  });

  it("parses --force and overridden concurrency flags", () => {
    const args = parseArgs([
      "--repo-map", "repo-map.yaml",
      "--env", "prd",
      "--out", "out",
      "--force",
      "--concurrency-git", "5",
    ]);
    expect(args.force).toBe(true);
    expect(args.concurrencyGit).toBe(5);
  });

  it("rejects an invalid --env value", () => {
    expect(() => parseArgs(["--repo-map", "repo-map.yaml", "--env", "staging", "--out", "out"])).toThrow(/dev, hml, prd/);
  });

  it("rejects missing required flags", () => {
    expect(() => parseArgs(["--env", "dev"])).toThrow(/Usage/);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- index.test.ts`
Expected: FAIL with "Cannot find module './index'"

- [x] **Step 3: Write the implementation**

```typescript
// scripts/okf-scan/index.ts
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

  for (const result of freshness) {
    manifest._repos[result.ref.key] = { lastScannedRef: result.currentRef, env: args.env };
  }
  manifest.lambdaEnvVarBindings = lambdaEnvVarBindings;
  await saveManifest(args.out, manifest);

  console.log(`okf-scan: wrote ${summary.written.length}, skipped ${summary.skipped.length} concept(s) into ${args.out}`);
  if (summary.needsReview.length > 0) {
    console.log(`okf-scan: ${summary.needsReview.length} concept(s) need manual review:`);
    for (const item of summary.needsReview) {
      console.log(`  - ${item.id}:`);
      item.notes.forEach((note) => console.log(`      ${note}`));
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

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- index.test.ts`
Expected: PASS (4 tests).

- [x] **Step 5: Add the npm script**

Add to `package.json`'s `"scripts"` block:

```json
    "okf-scan": "tsx scripts/okf-scan/index.ts"
```

- [x] **Step 6: Manually verify the wiring compiles and the fixtures still parse end-to-end**

Run: `npx tsc --noEmit -p .`
Expected: no errors — this confirms every module `index.ts` imports lines up (same types, same exported names) across all prior tasks.

This step intentionally does not run `index.ts` against real git remotes or a real `ANTHROPIC_API_KEY` — Task 21 covers the synthesize → validate integration seam with fixtures, which is the part of this pipeline that's practical to automate.

- [x] **Step 7: Commit**

```bash
git add scripts/okf-scan/index.ts scripts/okf-scan/index.test.ts package.json
git commit -m "feat: add okf-scan CLI entrypoint wiring the full pipeline together"
```

### Task 21: End-to-end fixture test through the real validator

Exercises the seam the unit tests above don't: a full `ScanResult` (with a container, a nested component, a relation between them, and a group) synthesized to disk, then loaded back through the actual production `importOkfBundle`/`validateArchModel` path the app itself uses.

**Files:**
- Test: `scripts/okf-scan/e2e.test.ts`

- [x] **Step 1: Write the test**

```typescript
// scripts/okf-scan/e2e.test.ts
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { importOkfBundle, type OkfIo } from "../../src/lib/okf-import";
import { validateArchModel } from "../../src/lib/validate-model";
import type { ScanResult } from "./types";
import type { LlmClient } from "./synthesize/llm";
import { synthesize } from "./synthesize/synthesize";

// importOkfBundle's basePath/link-target resolution assumes a "/"-rooted
// virtual path (it builds URLs like `https://okf.local${dirPath}/` internally
// to resolve relative links) — a raw Windows temp path (e.g. "C:\Users\...")
// breaks that, since a drive letter followed by ":" isn't valid there. Map a
// fixed virtual root onto the real temp dir instead, the same pattern
// scripts/validate-model.ts's own fsIo uses for "/okf-bundles/..." -> "public/okf-bundles/...".
const BUNDLE_VIRTUAL_ROOT = "/bundle";

function makeFsIo(realBundleDir: string): OkfIo {
  const toRealPath = (virtualPath: string) => path.join(realBundleDir, virtualPath.slice(BUNDLE_VIRTUAL_ROOT.length));
  return {
    readText: (p) => readFile(toRealPath(p), "utf-8"),
    exists: (p) =>
      access(toRealPath(p))
        .then(() => true)
        .catch(() => false),
  };
}

const fakeLlm: LlmClient = {
  async describeConcept(facts) {
    return `Generated description of ${facts.id}.`;
  },
};

describe("okf-scan end-to-end", () => {
  let bundleDir: string;

  beforeEach(async () => {
    bundleDir = await mkdtemp(path.join(tmpdir(), "okf-scan-e2e-"));
  });

  afterEach(async () => {
    await rm(bundleDir, { recursive: true, force: true });
  });

  it("produces a bundle that imports and validates through the real production path", async () => {
    const scanResult: ScanResult = {
      lambdaEnvVarBindings: { orders: { ORDERS_TABLE: "aws_dynamodb_table.orders_table" } },
      groups: [
        { id: "vpc-main", kind: "vpc", name: "main", parentGroupId: null },
        { id: "subnet-private_a", kind: "subnet", name: "private_a", parentGroupId: "vpc-main", subnetType: "private" },
      ],
      concepts: [
        {
          id: "orders",
          type: "AWS Lambda Function",
          awsResourceType: "AWS Lambda Function",
          level: "container",
          parentId: "platform",
          schema: { memory_size: 512 },
          groupId: "subnet-private_a",
          sourceFiles: [],
        },
        {
          id: "orders_table",
          type: "Amazon DynamoDB Table",
          awsResourceType: "Amazon DynamoDB Table",
          level: "container",
          parentId: "platform",
          schema: { billing_mode: "PAY_PER_REQUEST" },
          sourceFiles: [],
        },
        {
          id: "orders/handler",
          type: "AWS Lambda Handler",
          level: "component",
          parentId: "orders",
          relations: [
            {
              targetId: "orders_table",
              kind: "sync",
              evidence: "PutItemCommand + env var ORDERS_TABLE bound in Terraform to aws_dynamodb_table.orders_table",
            },
          ],
          sourceFiles: [],
        },
      ],
    };

    await synthesize({ scanResult, bundleDir, llm: fakeLlm });

    const model = await importOkfBundle(BUNDLE_VIRTUAL_ROOT, makeFsIo(bundleDir)).then(validateArchModel);

    expect(model.nodes.map((n) => n.id).sort()).toEqual(["orders", "orders/handler", "orders_table", "platform"]);
    const handler = model.nodes.find((n) => n.id === "orders/handler")!;
    expect(handler.parentId).toBe("orders");
    expect(model.relations).toHaveLength(1);
    expect(model.relations[0]).toMatchObject({ source: "orders/handler", target: "orders_table", kind: "sync" });

    // okf-import.ts derives every id — nodes and groups alike — from the
    // concept/group's actual file path, not from any internal field, so a
    // nested group's real id is its full path (e.g. "groups/vpc-main/subnet-private_a"),
    // not the bare "subnet-private_a" slug ConceptFacts/GroupFact used internally.
    expect(model.groups?.map((g) => g.id).sort()).toEqual(["groups/vpc-main", "groups/vpc-main/subnet-private_a"]);
    const orders = model.nodes.find((n) => n.id === "orders")!;
    expect(orders.groupId).toBe("groups/vpc-main/subnet-private_a");
  });
});
```

- [x] **Step 2: Run the test**

Run: `npm test -- e2e.test.ts`
Expected: PASS (1 test). If it fails on a dangling-relation or missing-node error from `validateArchModel`, the most likely cause is a directory/index.md mismatch between what `synthesize.ts` wrote and what `okf-import.ts` expects — re-check Task 19's `writeChildIndexes` and `writeGroupFiles` against `public/okf-bundles/order-system/`'s actual layout before changing test expectations.

- [x] **Step 3: Commit**

```bash
git add scripts/okf-scan/e2e.test.ts
git commit -m "test: add end-to-end fixture coverage through the real OKF import/validate path"
```

---
