import type { ArchNode } from "./types";

/** Namespace for synthesized cluster pseudo-node ids — never collides with a real ArchNode id. */
export const CLUSTER_ID_PREFIX = "__cluster__:";

/** Fixed sentinel id for children with no ddd.context, bucketed together rather than shown loose. */
export const UNGROUPED_CLUSTER_ID = `${CLUSTER_ID_PREFIX}__ungrouped__`;

export interface ClusterView {
  /** One synthetic ArchNode per distinct ddd.context among the input children, plus an "Outros" node if any child has none. */
  clusterNodes: ArchNode[];
  /** Real child id -> the id (from clusterNodes) it belongs to. */
  membershipByChildId: Map<string, string>;
}

/**
 * Derives a collapsible-cluster view of a container's children from their
 * ddd.context values alone — pure and stateless, mirroring how
 * computeBoundedContextBoxes (groups.ts) already derives box overlays from
 * the same field. Returns null when no child has ddd.context set, so a
 * container with no DDD tagging renders exactly as it always has.
 */
export function computeClusterView(children: ArchNode[]): ClusterView | null {
  if (!children.some((c) => c.ddd?.context)) return null;

  const idsByContext = new Map<string, string[]>();
  const ungroupedIds: string[] = [];
  children.forEach((child) => {
    if (child.ddd?.context) {
      idsByContext.set(child.ddd.context, [...(idsByContext.get(child.ddd.context) ?? []), child.id]);
    } else {
      ungroupedIds.push(child.id);
    }
  });

  const level = children[0].level;
  const parentId = children[0].parentId ?? null;
  const clusterNodes: ArchNode[] = [];
  const membershipByChildId = new Map<string, string>();

  idsByContext.forEach((memberIds, contextName) => {
    const id = `${CLUSTER_ID_PREFIX}${contextName}`;
    clusterNodes.push({
      id,
      name: `${contextName} (${memberIds.length})`,
      level,
      parentId,
      synthetic: { kind: "bounded-context-cluster", memberIds },
    });
    memberIds.forEach((memberId) => membershipByChildId.set(memberId, id));
  });

  if (ungroupedIds.length > 0) {
    clusterNodes.push({
      id: UNGROUPED_CLUSTER_ID,
      name: `Outros (${ungroupedIds.length})`,
      level,
      parentId,
      synthetic: { kind: "bounded-context-cluster", memberIds: ungroupedIds },
    });
    ungroupedIds.forEach((memberId) => membershipByChildId.set(memberId, UNGROUPED_CLUSTER_ID));
  }

  clusterNodes.sort((a, b) => a.name.localeCompare(b.name));

  return { clusterNodes, membershipByChildId };
}
