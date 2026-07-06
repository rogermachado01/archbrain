import { describe, expect, it } from "vitest";
import { computeClusterView, CLUSTER_ID_PREFIX, UNGROUPED_CLUSTER_ID } from "./clusters";
import type { ArchNode } from "./types";

function node(id: string, context?: string): ArchNode {
  return { id, name: id, level: "component", parentId: "container-1", ddd: context ? { context } : undefined };
}

describe("computeClusterView", () => {
  it("returns null when no child has a ddd.context", () => {
    const children = [node("a"), node("b")];
    expect(computeClusterView(children)).toBeNull();
  });

  it("groups children sharing a ddd.context into one cluster node", () => {
    const children = [node("a", "Navigation"), node("b", "Navigation"), node("c", "Settings")];
    const view = computeClusterView(children)!;

    expect(view.clusterNodes).toHaveLength(2);
    const nav = view.clusterNodes.find((c) => c.id === `${CLUSTER_ID_PREFIX}Navigation`)!;
    expect(nav.name).toBe("Navigation (2)");
    expect(nav.synthetic).toEqual({ kind: "bounded-context-cluster", memberIds: ["a", "b"] });
    expect(nav.level).toBe("component");
    expect(nav.parentId).toBe("container-1");

    const settings = view.clusterNodes.find((c) => c.id === `${CLUSTER_ID_PREFIX}Settings`)!;
    expect(settings.synthetic?.memberIds).toEqual(["c"]);
  });

  it("populates membershipByChildId for every child", () => {
    const children = [node("a", "Navigation"), node("b", "Settings")];
    const view = computeClusterView(children)!;

    expect(view.membershipByChildId.get("a")).toBe(`${CLUSTER_ID_PREFIX}Navigation`);
    expect(view.membershipByChildId.get("b")).toBe(`${CLUSTER_ID_PREFIX}Settings`);
  });

  it("buckets children with no ddd.context into a synthetic Outros cluster", () => {
    const children = [node("a", "Navigation"), node("b"), node("c")];
    const view = computeClusterView(children)!;

    const outros = view.clusterNodes.find((c) => c.id === UNGROUPED_CLUSTER_ID)!;
    expect(outros).toBeDefined();
    expect(outros.name).toBe("Outros (2)");
    expect(outros.synthetic?.memberIds).toEqual(["b", "c"]);
    expect(view.membershipByChildId.get("b")).toBe(UNGROUPED_CLUSTER_ID);
  });

  it("does not create an Outros cluster when every child has a context", () => {
    const children = [node("a", "Navigation"), node("b", "Settings")];
    const view = computeClusterView(children)!;

    expect(view.clusterNodes.find((c) => c.id === UNGROUPED_CLUSTER_ID)).toBeUndefined();
  });

  it("sorts cluster nodes alphabetically by name for stable render order", () => {
    const children = [node("a", "Zebra"), node("b", "Alpha")];
    const view = computeClusterView(children)!;

    expect(view.clusterNodes.map((c) => c.name)).toEqual(["Alpha (1)", "Zebra (1)"]);
  });
});
