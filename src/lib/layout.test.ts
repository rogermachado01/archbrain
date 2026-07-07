import { describe, expect, it } from "vitest";
import { computeLayeredPositions } from "./layout";
import type { ArchNode, ArchRelation } from "./types";

const OPTS = { nodeWidth: 100, nodeHeight: 40, columnGap: 20, rowGap: 10 };

function node(id: string): ArchNode {
  return { id, name: id, level: "component", parentId: null };
}

function relation(source: string, target: string): ArchRelation {
  return { id: `${source}->${target}`, source, target };
}

describe("computeLayeredPositions", () => {
  it("keeps a simple chain in one column per layer (backward compatible)", () => {
    const nodes = [node("a"), node("b")];
    const relations = [relation("a", "b")];

    const positions = computeLayeredPositions(nodes, relations, OPTS);

    const a = positions.find((p) => p.node.id === "a")!;
    const b = positions.find((p) => p.node.id === "b")!;
    expect(a.layer).toBe(0);
    expect(b.layer).toBe(1);
    expect(a.x).toBe(0);
    expect(b.x).toBe(OPTS.nodeWidth + OPTS.columnGap);
    expect(a.y).toBe(0);
    expect(b.y).toBe(0);
  });

  it("wraps a layer into a new sub-column once it exceeds maxRowsPerLayer", () => {
    // 5 unrelated root nodes, capped at 2 rows per layer -> 3 sub-columns (2,2,1)
    const nodes = ["a", "b", "c", "d", "e"].map(node);

    const positions = computeLayeredPositions(nodes, [], { ...OPTS, maxRowsPerLayer: 2 });

    // all still logically layer 0 (no relations at all)
    positions.forEach((p) => expect(p.layer).toBe(0));

    const byId = Object.fromEntries(positions.map((p) => [p.node.id, p]));
    const colWidth = OPTS.nodeWidth + OPTS.columnGap;
    const rowHeight = OPTS.nodeHeight + OPTS.rowGap;

    // sub-column 0: a (row 0), b (row 1)
    expect(byId.a).toMatchObject({ x: 0, y: 0 });
    expect(byId.b).toMatchObject({ x: 0, y: rowHeight });
    // sub-column 1: c (row 0), d (row 1)
    expect(byId.c).toMatchObject({ x: colWidth, y: 0 });
    expect(byId.d).toMatchObject({ x: colWidth, y: rowHeight });
    // sub-column 2: e (row 0)
    expect(byId.e).toMatchObject({ x: colWidth * 2, y: 0 });
  });

  it("starts the next real layer's x offset after every sub-column used by a wrapped layer", () => {
    const nodes = ["a", "b", "c", "d"].map(node);
    const relations = [relation("c", "d")]; // c stays layer 0, d becomes layer 1

    const positions = computeLayeredPositions(nodes, relations, { ...OPTS, maxRowsPerLayer: 2 });
    const byId = Object.fromEntries(positions.map((p) => [p.node.id, p]));
    const colWidth = OPTS.nodeWidth + OPTS.columnGap;

    // layer 0 has a, b, c -> 2 sub-columns (rows of 2, then 1)
    expect(byId.d.layer).toBe(1);
    expect(byId.d.x).toBe(colWidth * 2);
  });

  it("pulls a root node down to sit just above its only successor's layer", () => {
    // b -> c -> d (b:0, c:1, d:2); a -> d directly, a has no other edges
    const nodes = ["a", "b", "c", "d"].map(node);
    const relations = [relation("b", "c"), relation("c", "d"), relation("a", "d")];

    const positions = computeLayeredPositions(nodes, relations, OPTS);
    const byId = Object.fromEntries(positions.map((p) => [p.node.id, p]));

    expect(byId.b.layer).toBe(0);
    expect(byId.c.layer).toBe(1);
    expect(byId.d.layer).toBe(2);
    // "a" has no incoming edges and only feeds "d" (layer 2) -> pulled to layer 1,
    // one above "d" instead of parked at layer 0.
    expect(byId.a.layer).toBe(1);
  });

  it("does not move a root node whose successor is already adjacent", () => {
    const nodes = ["a", "x"].map(node);
    const relations = [relation("a", "x")];

    const positions = computeLayeredPositions(nodes, relations, OPTS);
    const byId = Object.fromEntries(positions.map((p) => [p.node.id, p]));

    expect(byId.a.layer).toBe(0);
    expect(byId.x.layer).toBe(1);
  });

  it("does not move a root node that has no successors at all", () => {
    const nodes = ["a", "b"].map(node);
    const positions = computeLayeredPositions(nodes, [], OPTS);
    const byId = Object.fromEntries(positions.map((p) => [p.node.id, p]));

    expect(byId.a.layer).toBe(0);
    expect(byId.b.layer).toBe(0);
  });
});
