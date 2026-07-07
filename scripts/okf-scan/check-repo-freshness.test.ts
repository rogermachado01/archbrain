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

const { checkRepoFreshness, listRepoRefs } = await import("./check-repo-freshness");

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

  it("wraps the underlying error with the repo ref's key, kind and path for context", async () => {
    const badConfig: RepoMapConfig = {
      frontend: [{ repo: "../unknown-repo", branch: { dev: "develop", hml: "staging", prd: "main" } }],
    };
    const manifest: ScanManifest = { _repos: {}, concepts: {} };

    await expect(checkRepoFreshness(badConfig, "dev", manifest)).rejects.toThrow(
      /unknown-repo[\s\S]*frontend[\s\S]*unexpected repoPath \.\.\/unknown-repo/
    );
  });
});

describe("listRepoRefs", () => {
  it("omits the terraform ref when the config has no terraform section", () => {
    const refs = listRepoRefs({ frontend: [{ repo: "../web-storefront", branch: { dev: "develop", hml: "staging", prd: "main" } }] }, "dev");
    expect(refs.map((r) => r.kind)).toEqual(["frontend"]);
  });

  it("omits lambda refs when the config has no resources section", () => {
    const refs = listRepoRefs(
      { terraform: { path: TF_FIXTURE_DIR, envFiles: { dev: "dev.tf", hml: "hml.tf", prd: "prd.tf" } } },
      "dev"
    );
    expect(refs.map((r) => r.kind)).toEqual(["terraform"]);
  });

  it("omits frontend refs when the config has no frontend section", () => {
    const refs = listRepoRefs(
      {
        resources: {
          "aws_lambda_function.orders": { repo: "../orders-service", branch: { dev: "develop", hml: "staging", prd: "main" } },
        },
      },
      "dev"
    );
    expect(refs.map((r) => r.kind)).toEqual(["lambda"]);
  });
});
