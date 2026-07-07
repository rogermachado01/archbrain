import type { ArchNode, AwsGroup } from "./types";
import type { LayoutPosition } from "./layout";

/** Structural shape both AwsGroup and the synthesized bounded-context groups satisfy. */
export interface GroupLike {
  id: string;
  name: string;
  /** id of the group this one nests inside; omit/null for a root-level group */
  parentGroupId?: string | null;
}

export interface GroupBox<G extends GroupLike = AwsGroup> {
  group: G;
  /** 0 = outermost (e.g. region), increases inward */
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GroupBoxOptions {
  nodeWidth: number;
  nodeHeight: number;
  /** outward padding added at each nesting hop */
  padding: number;
  /** extra top margin reserved for each level's own label */
  labelBand: number;
  /** which group a node belongs to; defaults to the AWS network group (node.groupId) */
  getGroupId?: (node: ArchNode) => string | null | undefined;
}

interface Bbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function unionBbox(a: Bbox | null, b: Bbox): Bbox {
  if (!a) return b;
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/**
 * Computes nested bounding boxes (Region > VPC > Availability Zone > Subnet,
 * or any subset) for the currently visible nodes, as a purely additive visual
 * overlay on top of already-computed layout positions — this never re-runs
 * or influences computeLayeredPositions, so layout stays group-agnostic.
 *
 * Generic over the group type so the same folding math also powers
 * computeBoundedContextBoxes below, via the `getGroupId` option.
 */
export function computeGroupBoxes<G extends GroupLike = AwsGroup>(
  nodes: ArchNode[],
  positions: LayoutPosition[],
  groups: G[],
  { nodeWidth, nodeHeight, padding, labelBand, getGroupId = (n) => n.groupId }: GroupBoxOptions
): GroupBox<G>[] {
  if (groups.length === 0) return [];

  const positionById = new Map(positions.map((p) => [p.node.id, p]));
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const depthById = new Map<string, number>();
  function depthOf(group: G): number {
    const cached = depthById.get(group.id);
    if (cached !== undefined) return cached;
    const parent = group.parentGroupId ? groupById.get(group.parentGroupId) : undefined;
    const depth = parent ? depthOf(parent) + 1 : 0;
    depthById.set(group.id, depth);
    return depth;
  }
  groups.forEach(depthOf);

  // Own bbox per group, from its direct member nodes only.
  const ownBboxByGroupId = new Map<string, Bbox>();
  nodes.forEach((node) => {
    const groupId = getGroupId(node);
    if (!groupId) return;
    const group = groupById.get(groupId);
    const pos = positionById.get(node.id);
    if (!group || !pos) return;
    const nodeBbox: Bbox = { minX: pos.x, minY: pos.y, maxX: pos.x + nodeWidth, maxY: pos.y + nodeHeight };
    ownBboxByGroupId.set(group.id, unionBbox(ownBboxByGroupId.get(group.id) ?? null, nodeBbox));
  });

  // Process innermost-first so each group can fold in its already-computed children.
  const orderedGroups = [...groups].sort((a, b) => depthOf(b) - depthOf(a));
  const boxByGroupId = new Map<string, GroupBox<G>>();

  orderedGroups.forEach((group) => {
    const childBoxes = groups
      .filter((g) => g.parentGroupId === group.id)
      .map((g) => boxByGroupId.get(g.id))
      .filter((b): b is GroupBox<G> => Boolean(b));

    let bbox = ownBboxByGroupId.get(group.id) ?? null;
    childBoxes.forEach((child) => {
      bbox = unionBbox(bbox, {
        minX: child.x,
        minY: child.y,
        maxX: child.x + child.width,
        maxY: child.y + child.height,
      });
    });

    if (!bbox) return; // no members and no non-empty child groups: irrelevant to this view

    boxByGroupId.set(group.id, {
      group,
      depth: depthOf(group),
      x: bbox.minX - padding,
      y: bbox.minY - padding - labelBand,
      width: bbox.maxX - bbox.minX + padding * 2,
      height: bbox.maxY - bbox.minY + padding * 2 + labelBand,
    });
  });

  return groups
    .map((g) => boxByGroupId.get(g.id))
    .filter((b): b is GroupBox<G> => Boolean(b))
    .sort((a, b) => a.depth - b.depth);
}

/** Prefix for synthesized bounded-context group ids, so they can never collide with real AwsGroup/ArchNode ids. */
export const BC_GROUP_ID_PREFIX = "__bc__:";

/** A bounded-context box is a flat (non-nestable) group synthesized from ArchNode.ddd.context. */
export interface BoundedContextGroup extends GroupLike {
  id: string;
  name: string;
}

/**
 * Synthesizes one flat group per distinct `node.ddd.context` value and folds
 * member positions into a box via the same math as computeGroupBoxes — a
 * bounded context is a linguistic boundary, not a network one, so it's
 * computed independently of (and can overlap) AWS network groups.
 */
export function computeBoundedContextBoxes(
  nodes: ArchNode[],
  positions: LayoutPosition[],
  options: { nodeWidth: number; nodeHeight: number; padding: number; labelBand: number }
): GroupBox<BoundedContextGroup>[] {
  const contextNames = new Set<string>();
  nodes.forEach((node) => {
    if (node.ddd?.context) contextNames.add(node.ddd.context);
  });
  const groups: BoundedContextGroup[] = [...contextNames].map((name) => ({
    id: `${BC_GROUP_ID_PREFIX}${name}`,
    name,
  }));

  return computeGroupBoxes(nodes, positions, groups, {
    ...options,
    getGroupId: (node) => (node.ddd?.context ? `${BC_GROUP_ID_PREFIX}${node.ddd.context}` : null),
  });
}
