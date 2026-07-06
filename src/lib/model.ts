import type { ArchModel, ArchNode, ArchRelation, RelationKind } from "./types";
import { resolveRelationKind } from "./relation-style";

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

/**
 * Walks up the parentId chain from id until it finds a node in visibleIds, or
 * null if none. clusterOverride (real node id -> currently-visible cluster
 * pseudo-node id) is consulted at every step of the walk, not just the
 * starting id — a node several levels below a clustered container still
 * needs to resolve through it — and takes priority over the plain
 * visibleIds check, since a clustered-away node's real container isn't
 * visible either while its cluster list is showing.
 */
function nearestVisibleAncestor(
  model: ArchModel,
  id: string,
  visibleIds: Set<string>,
  clusterOverride?: Map<string, string>
): string | null {
  let current = findNode(model, id);
  while (current) {
    const overridden = clusterOverride?.get(current.id);
    if (overridden) return overridden;
    if (visibleIds.has(current.id)) return current.id;
    current = current.parentId ? findNode(model, current.parentId) : undefined;
  }
  return null;
}

/**
 * Same as getRelationsForView for relations whose endpoints are already both
 * visible, but relations that cross a drill boundary are rolled up to the
 * nearest visible ancestor of each endpoint instead of being dropped — so a
 * component-to-component relation in different containers still shows up as
 * an aggregated edge between those containers. Relations that roll up to the
 * same node on both ends (i.e. internal to one visible node) are dropped.
 * Multiple relations rolling up to the same (source, target) pair merge into
 * a single edge with `aggregated: true`.
 * An optional clusterOverride additionally resolves a real node straight to a
 * currently-visible cluster pseudo-node id, when its actual container isn't
 * visible but its bounded-context cluster is (see src/lib/clusters.ts).
 */
export function getRelationsForViewWithRollup(
  model: ArchModel,
  visibleIds: Set<string>,
  clusterOverride?: Map<string, string>
): ArchRelation[] {
  const direct = getRelationsForView(model, visibleIds);
  const directIds = new Set(direct.map((r) => r.id));

  const groups = new Map<string, ArchRelation[]>();
  model.relations.forEach((r) => {
    if (directIds.has(r.id)) return;
    const src = nearestVisibleAncestor(model, r.source, visibleIds, clusterOverride);
    const tgt = nearestVisibleAncestor(model, r.target, visibleIds, clusterOverride);
    if (!src || !tgt || src === tgt) return;
    const key = `${src}->${tgt}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(r);
    else groups.set(key, [r]);
  });

  const rolledUp: ArchRelation[] = [];
  groups.forEach((rels, key) => {
    const [source, target] = key.split("->");
    if (rels.length === 1) {
      rolledUp.push({ ...rels[0], id: `rollup:${key}`, source, target, aggregated: true });
      return;
    }
    const kinds = new Set(rels.map(resolveRelationKind));
    rolledUp.push({
      id: `rollup:${key}`,
      source,
      target,
      label: `${rels.length} interações`,
      kind: kinds.size === 1 ? [...kinds][0] : "sync",
      aggregated: true,
    });
  });

  return [...direct, ...rolledUp];
}

/**
 * BFS over the given relations (typically the current view's visible
 * relations, post-rollup) tracing everything reachable from nodeId in the
 * given direction. "downstream" follows source->target edges (what nodeId
 * causes); "upstream" follows target->source edges (what can reach nodeId).
 * kindFilter, when given, only follows relations of that RelationKind.
 */
export function tracePath(
  relations: ArchRelation[],
  nodeId: string,
  direction: "upstream" | "downstream",
  kindFilter?: RelationKind
): { nodeIds: Set<string>; relationIds: Set<string> } {
  const nodeIds = new Set<string>([nodeId]);
  const relationIds = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const r of relations) {
      if (kindFilter && resolveRelationKind(r) !== kindFilter) continue;
      const from = direction === "downstream" ? r.source : r.target;
      const to = direction === "downstream" ? r.target : r.source;
      if (from !== current || relationIds.has(r.id)) continue;
      relationIds.add(r.id);
      if (!nodeIds.has(to)) {
        nodeIds.add(to);
        queue.push(to);
      }
    }
  }

  return { nodeIds, relationIds };
}
