import type { ConceptFacts, FactRelation } from "../types";
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

export function applyMaterializationPlan(allConcepts: ConceptFacts[], plan: MaterializationPlan): ConceptFacts[] {
  const memberToGroup = new Map<string, CapabilityGroup>();
  for (const group of plan.groups) {
    for (const memberId of group.memberIds) memberToGroup.set(memberId, group);
  }
  // Only meaningful for the promoted case: a promoted group's `containerId` IS
  // the concept's own new id (there's no separate wrapper container), so its
  // new parentId must be one level up from the *original* container being
  // materialized, not `group.containerId` itself — conflating the two was a
  // real bug caught by this module's own test suite while it was being written.
  const parentOfContainer = plan.containerId.includes("/")
    ? plan.containerId.slice(0, plan.containerId.lastIndexOf("/"))
    : null;

  const rewritten = allConcepts.map((concept) => {
    const newId = plan.idRemap[concept.id];
    const relations = concept.relations?.map((rel) => {
      const remapped = plan.idRemap[rel.targetId];
      return remapped ? { ...rel, targetId: remapped } : rel;
    });
    if (!newId) {
      return relations ? { ...concept, relations } : concept;
    }
    const group = memberToGroup.get(concept.id)!;
    const newParentId = group.promoted ? parentOfContainer! : group.containerId;
    return { ...concept, id: newId, parentId: newParentId, relations };
  });

  const rewrittenById = new Map(rewritten.map((c) => [c.id, c]));

  const newContainers: ConceptFacts[] = plan.groups
    .filter((g) => !g.promoted)
    .map((g) => {
      const seenTargetGroups = new Set<string>();
      const relations: FactRelation[] = [];
      for (const oldMemberId of g.memberIds) {
        const newMemberId = plan.idRemap[oldMemberId];
        const member = rewrittenById.get(newMemberId);
        for (const rel of member?.relations ?? []) {
          const targetGroup = plan.groups.find(
            (og) => og.containerId !== g.containerId && og.memberIds.some((m) => plan.idRemap[m] === rel.targetId),
          );
          if (!targetGroup || seenTargetGroups.has(targetGroup.containerId)) continue;
          seenTargetGroups.add(targetGroup.containerId);
          relations.push({ targetId: targetGroup.containerId, kind: rel.kind, evidence: rel.evidence });
        }
      }
      return {
        id: g.containerId,
        type: "UI Capability",
        level: "container" as const,
        parentId: plan.containerId,
        relations: relations.length > 0 ? relations : undefined,
        sourceFiles: [],
      };
    });

  return [...rewritten, ...newContainers];
}
