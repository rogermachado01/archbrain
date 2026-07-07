import type { ConceptFacts } from "../types";
import type { ContextAssignment } from "./organize";

/** Containers at or below this many children skip materialization entirely — deliberately higher than synthesize.ts's ORGANIZE_MIN_CHILDREN=9, since tagging is low-risk but restructuring the file tree is not. */
const MATERIALIZE_MIN_CHILDREN = 15;

/** A single-member group referenced by at least this many *other* groups is promoted to a sibling of the container instead of wrapped in its own one-file directory (the shared "theme" case). */
const PROMOTION_MIN_EXTERNAL_REFERRERS = 3;

export interface CapabilityGroup {
  /** New capability container id — or, when `promoted` is true, the concept's own new id (there is no separate wrapper container). */
  containerId: string;
  memberIds: string[];
  contextName: string;
  promoted: boolean;
}

export interface MaterializationPlan {
  containerId: string;
  groups: CapabilityGroup[];
  /** old concept id -> new concept id, for every renamed member across all groups */
  idRemap: Record<string, string>;
}

const COMBINING_DIACRITICS = new RegExp("[̀-ͯ]", "g");

function slugify(name: string): string {
  return name
    .normalize("NFD") // decompose accented letters into base letter + combining mark(s), e.g. "ã" -> "a" + U+0303
    .replace(COMBINING_DIACRITICS, "") // strip the combining marks left behind by NFD, leaving plain ASCII base letters
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Decides whether a container's children should be materialized into real
 * capability sub-containers, and if so, how — pure planning, no file I/O.
 * Returns null when materialization doesn't apply (too few children, or the
 * organizer didn't produce at least 2 distinct groups — materializing into a
 * single group would be a no-op).
 */
export function computeMaterializationPlan(
  containerId: string,
  children: ConceptFacts[],
  assignments: Record<string, ContextAssignment>,
  allConcepts: ConceptFacts[],
): MaterializationPlan | null {
  if (children.length < MATERIALIZE_MIN_CHILDREN) return null;

  const idsByContext = new Map<string, string[]>();
  for (const child of children) {
    const context = assignments[child.id]?.context;
    if (!context) continue;
    idsByContext.set(context, [...(idsByContext.get(context) ?? []), child.id]);
  }
  if (idsByContext.size < 2) return null;

  const groupOfChildId = new Map<string, string>();
  idsByContext.forEach((ids, context) => ids.forEach((id) => groupOfChildId.set(id, context)));

  // For every child id, the set of *other groups* that have at least one
  // relation targeting it (cross-group only — same-group references don't
  // count toward "this is a shared dependency of the whole container").
  const referrerGroupsByTargetId = new Map<string, Set<string>>();
  for (const concept of allConcepts) {
    const sourceGroup = groupOfChildId.get(concept.id);
    for (const rel of concept.relations ?? []) {
      const targetGroup = groupOfChildId.get(rel.targetId);
      if (!targetGroup) continue;
      if (sourceGroup !== undefined && sourceGroup === targetGroup) continue;
      const set = referrerGroupsByTargetId.get(rel.targetId) ?? new Set<string>();
      set.add(sourceGroup ?? `__outside__:${concept.id}`);
      referrerGroupsByTargetId.set(rel.targetId, set);
    }
  }

  const parentOfContainer = containerId.includes("/") ? containerId.slice(0, containerId.lastIndexOf("/")) : null;
  const groups: CapabilityGroup[] = [];
  const idRemap: Record<string, string> = {};
  // Guards against two distinct context names slugifying to the same string
  // (e.g. "UI/UX" and "UI UX" both -> "ui-ux") producing two CapabilityGroups
  // with an identical containerId — the later one gets a numeric suffix.
  const usedContainerIds = new Set<string>();

  idsByContext.forEach((memberIds, contextName) => {
    if (memberIds.length === 1 && parentOfContainer !== null) {
      const soleId = memberIds[0];
      const referrerCount = referrerGroupsByTargetId.get(soleId)?.size ?? 0;
      if (referrerCount >= PROMOTION_MIN_EXTERNAL_REFERRERS) {
        const leafSegment = soleId.split("/").pop()!;
        const newId = `${parentOfContainer}/${leafSegment}`;
        usedContainerIds.add(newId);
        groups.push({ containerId: newId, memberIds, contextName, promoted: true });
        idRemap[soleId] = newId;
        return;
      }
    }
    const slug = slugify(contextName);
    let newContainerId = `${containerId}/${slug}`;
    let suffix = 2;
    while (usedContainerIds.has(newContainerId)) {
      newContainerId = `${containerId}/${slug}-${suffix}`;
      suffix++;
    }
    usedContainerIds.add(newContainerId);
    groups.push({ containerId: newContainerId, memberIds, contextName, promoted: false });
    for (const memberId of memberIds) {
      const leafSegment = memberId.split("/").pop()!;
      idRemap[memberId] = `${newContainerId}/${leafSegment}`;
    }
  });

  return { containerId, groups, idRemap };
}
