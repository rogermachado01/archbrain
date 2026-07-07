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
  /** caps how many nodes stack in one column before wrapping into a new
   *  sub-column within the same topological layer (default 6). */
  maxRowsPerLayer?: number;
}

const DEFAULT_MAX_ROWS_PER_LAYER = 6;

/**
 * Positions nodes left-to-right by topological layer (longest path from a
 * node with no incoming edges, among the currently visible relations), so
 * edges mostly flow forward between adjacent layers instead of cutting
 * through unrelated nodes the way a plain index-based grid would.
 */
export function computeLayeredPositions(
  nodes: ArchNode[],
  relations: ArchRelation[],
  { nodeWidth, nodeHeight, columnGap, rowGap, maxRowsPerLayer = DEFAULT_MAX_ROWS_PER_LAYER }: LayoutOptions
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

  // A node with no incoming edges has no predecessor constraint, so it's
  // always safe to pull it down closer to its nearest successor instead of
  // leaving it parked at layer 0 — the new layer is still guaranteed to be
  // less than every successor's layer (min(successorLayers) - 1 < all of
  // them), so this can never introduce a backward-pointing edge. Nodes with
  // at least one incoming edge already sit at the tightest valid layer
  // (max(predecessor layers) + 1) and are left untouched.
  nodes.forEach((n) => {
    if ((inDegree.get(n.id) ?? 0) !== 0) return;
    const successorLayers = (outgoing.get(n.id) ?? []).map((id) => layer.get(id) ?? 0);
    if (successorLayers.length === 0) return;
    const pulled = Math.min(...successorLayers) - 1;
    if (pulled > (layer.get(n.id) ?? 0)) layer.set(n.id, pulled);
  });

  // Group nodes by their final layer, then lay each layer out as a grid
  // capped at maxRowsPerLayer rows, wrapping into extra sub-columns instead
  // of one ever-taller single column. `layer` itself (used elsewhere to
  // detect edges that skip more than one layer) stays the pure topological
  // value — only the visual x/y placement changes.
  const nodesByLayer = new Map<number, ArchNode[]>();
  nodes.forEach((n) => {
    const l = layer.get(n.id) ?? 0;
    if (!nodesByLayer.has(l)) nodesByLayer.set(l, []);
    nodesByLayer.get(l)!.push(n);
  });

  const positionsById = new Map<string, LayoutPosition>();
  let cumulativeX = 0;
  [...nodesByLayer.keys()]
    .sort((a, b) => a - b)
    .forEach((l) => {
      const layerNodes = nodesByLayer.get(l)!;
      layerNodes.forEach((n, i) => {
        const row = i % maxRowsPerLayer;
        const subColumn = Math.floor(i / maxRowsPerLayer);
        positionsById.set(n.id, {
          node: n,
          x: cumulativeX + subColumn * (nodeWidth + columnGap),
          y: row * (nodeHeight + rowGap),
          layer: l,
        });
      });
      const subColumns = Math.ceil(layerNodes.length / maxRowsPerLayer);
      cumulativeX += subColumns * (nodeWidth + columnGap);
    });

  return nodes.map((n) => positionsById.get(n.id)!);
}
