import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ConceptFacts, GroupFact, ScanResult } from "../types";
import type { LlmClient } from "./llm";
import { synthesize } from "./synthesize";

function fakeLlm(): { client: LlmClient; calls: ConceptFacts[] } {
  const calls: ConceptFacts[] = [];
  return {
    calls,
    client: {
      async describeConcept(facts) {
        calls.push(facts);
        return { prose: `Prose for ${facts.id}.`, relationLabels: [] };
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

  it("groups a child by its parentId even when the id doesn't mirror that parentId chain", async () => {
    // Old code derived the container by string-splitting facts.id on "/".
    // "handler_fn" has no "/" at all, so the old code's `!id.includes("/")`
    // guard treated it as top-level and silently dropped it (it's also not
    // parentId === ROOT_CONTEXT_ID, so writeRootFiles wouldn't list it
    // either) — a fully orphaned concept: written to disk, never linked from
    // any index.md. parentId is the authoritative field and must be used
    // instead.
    const scanResult: ScanResult = {
      groups: [],
      lambdaEnvVarBindings: {},
      concepts: [
        { id: "orders", type: "AWS Lambda Function", level: "container", parentId: "platform", sourceFiles: [] },
        { id: "handler_fn", type: "AWS Lambda Handler", level: "component", parentId: "orders", sourceFiles: [] },
      ],
    };
    const { client } = fakeLlm();
    await synthesize({ scanResult, bundleDir, llm: client });

    const childIndex = await readFile(path.join(bundleDir, "orders", "index.md"), "utf-8");
    expect(childIndex).toContain("[Handler Fn](handler_fn.md)");
  });

  it("throws a clear error from synthesize() (not deep inside per-concept markdown generation) when groups form a parentGroupId cycle", async () => {
    const scanResult: ScanResult = {
      groups: [
        { id: "vpc-a", kind: "vpc", name: "VPC A", parentGroupId: "vpc-b" },
        { id: "vpc-b", kind: "vpc", name: "VPC B", parentGroupId: "vpc-a" },
      ],
      lambdaEnvVarBindings: {},
      concepts: [{ id: "orders", type: "AWS Lambda Function", level: "container", parentId: "platform", sourceFiles: [] }],
    };
    const { client, calls } = fakeLlm();

    await expect(synthesize({ scanResult, bundleDir, llm: client })).rejects.toThrow(/cycle/i);
    // Validation must run before any LLM calls / writes, not surface as a
    // failure buried inside the concurrency pool.
    expect(calls).toHaveLength(0);
  });

  it("throws a clear error when a group's parentGroupId references an id that doesn't exist", async () => {
    const scanResult: ScanResult = {
      groups: [{ id: "subnet-a", kind: "subnet", name: "Subnet A", parentGroupId: "does-not-exist" }],
      lambdaEnvVarBindings: {},
      concepts: [],
    };
    const { client, calls } = fakeLlm();

    await expect(synthesize({ scanResult, bundleDir, llm: client })).rejects.toThrow(/does-not-exist/);
    expect(calls).toHaveLength(0);
  });

  it("throws a clear error instead of silently overwriting groups/index.md when a concept's parentId collides with the reserved groups directory", async () => {
    const scanResult: ScanResult = {
      groups: [{ id: "vpc-a", kind: "vpc", name: "VPC A" }],
      lambdaEnvVarBindings: {},
      concepts: [
        { id: "groups", type: "Software System", level: "container", parentId: "platform", sourceFiles: [] },
        { id: "groups/foo", type: "AWS Lambda Function", level: "component", parentId: "groups", sourceFiles: [] },
      ],
    };
    const { client, calls } = fakeLlm();

    await expect(synthesize({ scanResult, bundleDir, llm: client })).rejects.toThrow(/reserved/i);
    expect(calls).toHaveLength(0);
  });

  it("isolates one concept's LLM failure so other concepts' work and the manifest are still persisted", async () => {
    const calls: string[] = [];
    const client: LlmClient = {
      async describeConcept(facts) {
        calls.push(facts.id);
        if (facts.id === "orders_table") throw new Error("rate limited");
        return { prose: `Prose for ${facts.id}.`, relationLabels: [] };
      },
    };
    const scanResult = scanResultWith(512);

    const summary = await synthesize({ scanResult, bundleDir, llm: client });

    expect(summary.written).toEqual(["orders"]);
    expect(summary.failed).toEqual([{ id: "orders_table", error: "rate limited" }]);
    expect(calls.sort()).toEqual(["orders", "orders_table"]);

    const ordersContent = await readFile(path.join(bundleDir, "orders.md"), "utf-8");
    expect(ordersContent).toContain("Prose for orders.");
    await expect(readFile(path.join(bundleDir, "orders_table.md"), "utf-8")).rejects.toThrow();

    // The failed concept has no manifest entry, so it's retried (not skipped) next run,
    // while the concept that did succeed is skipped as unchanged.
    const { client: llm2, calls: calls2 } = fakeLlm();
    const summary2 = await synthesize({ scanResult, bundleDir, llm: llm2 });
    expect(summary2.skipped).toEqual(["orders"]);
    expect(summary2.written).toEqual(["orders_table"]);
    expect(calls2.map((f) => f.id)).toEqual(["orders_table"]);
  });

  it("regenerates every concept when force is set, even though the hash is unchanged", async () => {
    const { client: llm1 } = fakeLlm();
    await synthesize({ scanResult: scanResultWith(512), bundleDir, llm: llm1 });

    const { client: llm2, calls: calls2 } = fakeLlm();
    const summary2 = await synthesize({ scanResult: scanResultWith(512), bundleDir, llm: llm2, force: true });

    expect(calls2.map((f) => f.id).sort()).toEqual(["orders", "orders_table"]);
    expect(summary2.written.sort()).toEqual(["orders", "orders_table"]);
    expect(summary2.skipped).toEqual([]);
  });

  it("writes real, non-cyclic AWS network groups and links a concept's groupId to them", async () => {
    const groups: GroupFact[] = [
      { id: "region-a", kind: "region", name: "us-east-1" },
      { id: "vpc-a", kind: "vpc", name: "Main VPC", parentGroupId: "region-a" },
    ];
    const scanResult: ScanResult = {
      groups,
      lambdaEnvVarBindings: {},
      concepts: [
        {
          id: "orders",
          type: "AWS Lambda Function",
          level: "container",
          parentId: "platform",
          groupId: "vpc-a",
          sourceFiles: [],
        },
      ],
    };
    const { client } = fakeLlm();
    await synthesize({ scanResult, bundleDir, llm: client });

    const ordersContent = await readFile(path.join(bundleDir, "orders.md"), "utf-8");
    expect(ordersContent).toContain("group: groups/region-a/vpc-a.md");

    const groupsIndex = await readFile(path.join(bundleDir, "groups", "index.md"), "utf-8");
    expect(groupsIndex).toContain("[us-east-1](region-a.md)");

    const regionIndex = await readFile(path.join(bundleDir, "groups", "region-a", "index.md"), "utf-8");
    expect(regionIndex).toContain("[Main VPC](vpc-a.md)");

    const vpcFile = await readFile(path.join(bundleDir, "groups", "region-a", "vpc-a.md"), "utf-8");
    expect(vpcFile).toContain("kind: vpc");
  });

  it("surfaces needsReview notes from ConceptFacts in the summary", async () => {
    const scanResult: ScanResult = {
      groups: [],
      lambdaEnvVarBindings: {},
      concepts: [
        {
          id: "orders",
          type: "AWS Lambda Function",
          level: "container",
          parentId: "platform",
          sourceFiles: [],
          needsReview: ["dynamic env var value could not be resolved"],
        },
      ],
    };
    const { client } = fakeLlm();

    const summary = await synthesize({ scanResult, bundleDir, llm: client });

    expect(summary.needsReview).toEqual([
      { id: "orders", notes: ["dynamic env var value could not be resolved"] },
    ]);
  });

  it("uses the LLM-provided relation label in the Relations section instead of the raw evidence", async () => {
    const scanResult: ScanResult = {
      groups: [],
      lambdaEnvVarBindings: {},
      concepts: [
        {
          id: "orders",
          type: "AWS Lambda Function",
          level: "container",
          parentId: "platform",
          relations: [{ targetId: "orders_table", kind: "sync", evidence: "PutItemCommand" }],
          sourceFiles: [],
        },
        { id: "orders_table", type: "Amazon DynamoDB Table", level: "container", parentId: "platform", sourceFiles: [] },
      ],
    };
    const client: LlmClient = {
      async describeConcept(facts) {
        return {
          prose: `Prose for ${facts.id}.`,
          relationLabels: facts.relations?.map(() => "Writes new orders to the table") ?? [],
        };
      },
    };

    await synthesize({ scanResult, bundleDir, llm: client });

    const ordersContent = await readFile(path.join(bundleDir, "orders.md"), "utf-8");
    expect(ordersContent).toContain("[Orders Table](orders_table.md) — Writes new orders to the table {kind: sync}");
    expect(ordersContent).not.toContain("PutItemCommand");
  });
});
