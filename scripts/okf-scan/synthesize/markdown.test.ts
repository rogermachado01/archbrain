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
