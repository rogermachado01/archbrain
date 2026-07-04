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
