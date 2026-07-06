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
    return { prose: `Generated description of ${facts.id}.`, relationLabels: [] };
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

  it("produces a valid bundle for a frontend route-hierarchy scan (context app → route containers → components)", async () => {
    const scanResult: ScanResult = {
      lambdaEnvVarBindings: {},
      groups: [],
      concepts: [
        { id: "shop", type: "Frontend Application", level: "context", parentId: null, sourceFiles: [] },
        { id: "shop/index-page", type: "Next.js Page", level: "container", parentId: "shop", routePath: "/", sourceFiles: [] },
        {
          id: "shop/index-page/hero", type: "React Component", level: "component", parentId: "shop/index-page",
          usedByRoutes: ["/"], sourceFiles: [],
        },
        { id: "shop/shared-ui", type: "Shared UI & Utilities", level: "container", parentId: "shop", sourceFiles: [] },
        { id: "shop/shared-ui/button", type: "React Component", level: "component", parentId: "shop/shared-ui", sourceFiles: [] },
      ],
    };

    await synthesize({ scanResult, bundleDir, llm: fakeLlm });

    const model = await importOkfBundle(BUNDLE_VIRTUAL_ROOT, makeFsIo(bundleDir)).then(validateArchModel);

    expect(model.nodes.map((n) => n.id).sort()).toEqual([
      "shop", "shop/index-page", "shop/index-page/hero", "shop/shared-ui", "shop/shared-ui/button",
    ]);
    expect(model.nodes.find((n) => n.id === "shop")).toMatchObject({ level: "context", parentId: null });
    expect(model.nodes.find((n) => n.id === "shop/index-page")).toMatchObject({ level: "container", parentId: "shop" });
    expect(model.nodes.find((n) => n.id === "shop/index-page/hero")).toMatchObject({ parentId: "shop/index-page" });
    // frontend-only bundle: no platform node, no default AWS Cloud boundary
    expect(model.nodes.some((n) => n.id === "platform")).toBe(false);
    expect(model.boundary).toBe(false);
  });
});
