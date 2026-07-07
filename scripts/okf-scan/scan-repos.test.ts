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
