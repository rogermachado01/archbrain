import type { ArchNode, ArchRelation } from "./types";

export interface LayoutPosition {
  node: ArchNode;
  x: number;
  y: number;
  /** Topological column index (0 = no incoming edges). Exposed so the
   *  renderer can detect edges that skip over several layers and reroute
   *  them around busy intermediate columns instead of drawing a straight
   *  line through unrelated nodes. */
  layer: number;
}

interface LayoutOptions {
  nodeWidth: number;
  nodeHeight: number;
  columnGap: number;
  rowGap: number;
}

/**
 * Positions nodes left-to-right by topological layer (longest path from a
 * node with no incoming edges, among the currently visible relations), so
 * edges mostly flow forward between adjacent layers instead of cutting
 * through unrelated nodes the way a plain index-based grid would.
 */
export function computeLayeredPositions(
  nodes: ArchNode[],
  relations: ArchRelation[],
  { nodeWidth, nodeHeight, columnGap, rowGap }: LayoutOptions
): LayoutPosition[] {
  const visibleIds = new Set(nodes.map((n) => n.id));
  const edges = relations.filter(
    (r) => visibleIds.has(r.source) && visibleIds.has(r.target) && r.source !== r.target
  );

  const outgoing = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  nodes.forEach((n) => {
    outgoing.set(n.id, []);
    inDegree.set(n.id, 0);
  });
  edges.forEach((e) => {
    outgoing.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  });

  const layer = new Map<string, number>();
  const queue = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
  queue.forEach((id) => layer.set(id, 0));
  const remaining = new Map(inDegree);
  const visited = new Set(queue);

  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    const currentLayer = layer.get(id) ?? 0;
    for (const targetId of outgoing.get(id) ?? []) {
      layer.set(targetId, Math.max(layer.get(targetId) ?? 0, currentLayer + 1));
      const left = (remaining.get(targetId) ?? 0) - 1;
      remaining.set(targetId, left);
      if (left <= 0 && !visited.has(targetId)) {
        visited.add(targetId);
        queue.push(targetId);
      }
    }
  }
  // Nodes never reached (e.g. part of a relation cycle) default to layer 0.
  nodes.forEach((n) => {
    if (!layer.has(n.id)) layer.set(n.id, 0);
  });

  const rowByLayer = new Map<number, number>();
  return nodes.map((node) => {
    const nodeLayer = layer.get(node.id) ?? 0;
    const row = rowByLayer.get(nodeLayer) ?? 0;
    rowByLayer.set(nodeLayer, row + 1);
    return {
      node,
      x: nodeLayer * (nodeWidth + columnGap),
      y: row * (nodeHeight + rowGap),
      layer: nodeLayer,
    };
  });
}
