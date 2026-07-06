import { describe, expect, it } from "vitest";
import { getRelationsForViewWithRollup } from "./model";
import type { ArchModel } from "./types";

function buildModel(): ArchModel {
  return {
    nodes: [
      { id: "container-1", name: "Container 1", level: "container", parentId: null },
      { id: "container-1/a", name: "A", level: "component", parentId: "container-1", ddd: { context: "Navigation" } },
      { id: "container-1/b", name: "B", level: "component", parentId: "container-1", ddd: { context: "Navigation" } },
      { id: "container-1/c", name: "C", level: "component", parentId: "container-1", ddd: { context: "Settings" } },
      { id: "container-1/d", name: "D", level: "component", parentId: "container-1" },
    ],
    relations: [
      { id: "r1", source: "container-1/a", target: "container-1/c", kind: "sync" },
      { id: "r2", source: "container-1/b", target: "container-1/d", kind: "sync" },
    ],
  };
}

describe("getRelationsForViewWithRollup with clusterOverride", () => {
  it("rolls up a relation between two different clusters to an edge between the cluster ids", () => {
    const model = buildModel();
    const clusterOverride = new Map([
      ["container-1/a", "__cluster__:Navigation"],
      ["container-1/b", "__cluster__:Navigation"],
      ["container-1/c", "__cluster__:Settings"],
      ["container-1/d", "__cluster__:__ungrouped__"],
    ]);
    const visibleIds = new Set(["__cluster__:Navigation", "__cluster__:Settings", "__cluster__:__ungrouped__"]);

    const relations = getRelationsForViewWithRollup(model, visibleIds, clusterOverride);

    expect(relations).toHaveLength(2);
    const r1 = relations.find((r) => r.id === "rollup:__cluster__:Navigation->__cluster__:Settings");
    expect(r1).toMatchObject({ source: "__cluster__:Navigation", target: "__cluster__:Settings" });
    const r2 = relations.find((r) => r.id === "rollup:__cluster__:Navigation->__cluster__:__ungrouped__");
    expect(r2).toMatchObject({ source: "__cluster__:Navigation", target: "__cluster__:__ungrouped__" });
  });

  it("drops a relation to a sibling cluster's member when drilled into just one cluster (no override passed)", () => {
    const model = buildModel();
    // Drilled into the "Navigation" cluster: only its real members are visible, no override.
    const visibleIds = new Set(["container-1/a", "container-1/b"]);

    const relations = getRelationsForViewWithRollup(model, visibleIds);

    // r1 (a -> c) and r2 (b -> d) both target a node outside this cluster with no
    // override to resolve through, so neither rolls up — same as today's existing
    // sibling-container behavior.
    expect(relations).toHaveLength(0);
  });

  it("behaves exactly as before when no clusterOverride is passed (backward compatible)", () => {
    const model = buildModel();
    const visibleIds = new Set(["container-1"]);

    const relations = getRelationsForViewWithRollup(model, visibleIds);

    // Both real relations are between components under container-1, which is visible.
    // Both endpoints resolve to the same visible ancestor (container-1 itself), so
    // per the existing "src === tgt" drop rule these are internal and produce no edges —
    // exactly the same outcome getRelationsForViewWithRollup already produced for this
    // input before clusterOverride was added.
    expect(relations).toHaveLength(0);
  });
});
