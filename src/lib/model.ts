import type { ArchModel, ArchNode, ArchRelation } from "./types";

/** Direct children of a node (or top-level context nodes when parentId is null). */
export function getChildren(model: ArchModel, parentId: string | null): ArchNode[] {
  return model.nodes.filter((n) => (n.parentId ?? null) === parentId);
}

export function findNode(model: ArchModel, id: string): ArchNode | undefined {
  return model.nodes.find((n) => n.id === id);
}

/** Relations where both endpoints are visible in the given set of node ids. */
export function getRelationsForView(model: ArchModel, visibleIds: Set<string>): ArchRelation[] {
  return model.relations.filter((r) => visibleIds.has(r.source) && visibleIds.has(r.target));
}

/** Whether a node has any children, i.e. can be drilled into. */
export function hasChildren(model: ArchModel, id: string): boolean {
  return model.nodes.some((n) => n.parentId === id);
}

/** Breadcrumb trail from the root down to (and including) the given node. */
export function getBreadcrumb(model: ArchModel, id: string | null): ArchNode[] {
  const trail: ArchNode[] = [];
  let current = id ? findNode(model, id) : undefined;
  while (current) {
    trail.unshift(current);
    current = current.parentId ? findNode(model, current.parentId) : undefined;
  }
  return trail;
}
