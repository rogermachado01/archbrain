import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ConceptFacts, FactRelation, ScanResult } from "../types";
import type { ContextAssignment, OrganizerClient } from "./organize";
import type { ActorInferenceClient, ActorProposal } from "./actors";

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
  /**
   * True when this group's wrapper container must be a sibling of the
   * materialized container (parented one level up, at the same level as the
   * materialized container itself) instead of nested under it. Set for every
   * group when `dissolvesOriginal` is true — see that field's doc comment.
   */
  sibling?: boolean;
}

export interface MaterializationPlan {
  containerId: string;
  groups: CapabilityGroup[];
  /** old concept id -> new concept id, for every renamed member across all groups */
  idRemap: Record<string, string>;
  /**
   * True when the materialized container is itself "container"-level (e.g. a
   * frontend's synthetic "shared-ui" container), not "context"-level. The C4
   * model this app validates against is a strict 3-level stack with no level
   * below "component" — so there's no room to nest a nested "container"-level
   * wrapper below an already-"container"-level parent while still leaving its
   * "component"-level members one level further down. Every group therefore
   * becomes a full sibling of the materialized container instead (same
   * shape a human curator produced by hand for the reference "blog2"
   * bundle), and the now-childless original container concept is dropped
   * from the output entirely by `applyMaterializationPlan`.
   */
  dissolvesOriginal?: boolean;
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

  // See MaterializationPlan.dissolvesOriginal's doc comment. When the
  // container's own level is known and is "container" (not "context"), the
  // usual nested-wrapper shape below is invalid — fall back to "unknown"
  // (treated as "context", the pre-existing default) when the container's
  // own concept isn't present in `allConcepts`, same fallback
  // applyMaterializationPlan uses.
  const containerLevel = allConcepts.find((c) => c.id === containerId)?.level;
  const dissolvesOriginal = containerLevel === "container";
  if (dissolvesOriginal && parentOfContainer === null) return null; // nowhere to promote siblings to

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
      if (dissolvesOriginal || referrerCount >= PROMOTION_MIN_EXTERNAL_REFERRERS) {
        const leafSegment = soleId.split("/").pop()!;
        const newId = `${parentOfContainer}/${leafSegment}`;
        usedContainerIds.add(newId);
        groups.push({ containerId: newId, memberIds, contextName, promoted: true });
        idRemap[soleId] = newId;
        return;
      }
    }
    const slug = slugify(contextName);
    const wrapperParent = dissolvesOriginal ? parentOfContainer! : containerId;
    let newContainerId = `${wrapperParent}/${slug}`;
    let suffix = 2;
    while (usedContainerIds.has(newContainerId)) {
      newContainerId = `${wrapperParent}/${slug}-${suffix}`;
      suffix++;
    }
    usedContainerIds.add(newContainerId);
    groups.push({ containerId: newContainerId, memberIds, contextName, promoted: false, sibling: dissolvesOriginal || undefined });
    for (const memberId of memberIds) {
      const leafSegment = memberId.split("/").pop()!;
      idRemap[memberId] = `${newContainerId}/${leafSegment}`;
    }
  });

  return { containerId, groups, idRemap, dissolvesOriginal: dissolvesOriginal || undefined };
}

/**
 * A hand-edited proposal (see the propose/apply review flow) can drift out of
 * sync between a plan's `groups[].memberIds` and its `idRemap` — e.g. a
 * reviewer removes one id from a group without also removing its idRemap
 * entry, or vice versa. Left unchecked, that produces a bare
 * "Cannot read properties of undefined" crash deep in applyMaterializationPlan
 * instead of a message pointing at the actual problem.
 */
function validatePlanConsistency(plan: MaterializationPlan): void {
  const memberIdsInGroups = new Set<string>();
  for (const group of plan.groups) {
    for (const memberId of group.memberIds) memberIdsInGroups.add(memberId);
  }
  for (const oldId of Object.keys(plan.idRemap)) {
    if (!memberIdsInGroups.has(oldId)) {
      throw new Error(
        `Malformed materialization plan for container "${plan.containerId}": idRemap has an entry for "${oldId}" but no group's memberIds includes it.`,
      );
    }
  }
  for (const group of plan.groups) {
    for (const memberId of group.memberIds) {
      if (!(memberId in plan.idRemap)) {
        throw new Error(
          `Malformed materialization plan for container "${plan.containerId}": group "${group.contextName}" lists member "${memberId}" but idRemap has no entry for it.`,
        );
      }
    }
  }
}

/**
 * The C4 model this app validates against is a strict 3-level stack
 * (context -> container -> component, see validate-model.ts's LEVEL_ORDER)
 * with no level below "component" — so a new wrapper container inserted
 * between a materialized concept and its members can only be "container"
 * when that concept is itself "context"-level; when it's already
 * "container"-level (e.g. the synthetic "shared-ui" container
 * route-hierarchy.ts creates for a frontend app), the wrapper must be
 * "component" instead, or the result fails validateArchModel's nesting check.
 */
function childLevelOf(level: ConceptFacts["level"]): ConceptFacts["level"] {
  if (level === "context") return "container";
  if (level === "container") return "component";
  throw new Error(`materialize: cannot materialize children of a "component"-level concept — no C4 level exists below it.`);
}

export function applyMaterializationPlan(allConcepts: ConceptFacts[], plan: MaterializationPlan): ConceptFacts[] {
  validatePlanConsistency(plan);
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

  // The container being materialized may not appear in `allConcepts` (some
  // callers, and this module's own tests, only ever pass its *children*) —
  // default to the pre-existing "container" behavior in that case rather than
  // guessing wrong. When it IS present, derive the real level from it so
  // materializing an already-"container"-level concept's children produces
  // valid "component"-level wrappers instead of an invalid container-in-container nesting.
  const containerLevel = allConcepts.find((c) => c.id === plan.containerId)?.level;
  const wrapperLevel = containerLevel ? childLevelOf(containerLevel) : "container";

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
    // Only `promoted` changes a *member's* own parent (it becomes the new
    // container itself, with no separate wrapper) — a `sibling` group still
    // parents its members at its own wrapper container id, same as the
    // nested case; `sibling` only changes where that wrapper itself is
    // parented (handled below, in `newContainers`).
    const newParentId = group.promoted ? parentOfContainer! : group.containerId;
    // Promoted concepts move up to become a sibling of `plan.containerId`
    // itself, so their level must match its level, not stay at their old
    // (deeper) one — same reasoning as `wrapperLevel` above, just one level
    // shallower. A `sibling` group's members stay directly under its new
    // wrapper container (which is itself the sibling, not the member), so
    // their own level is unchanged — same as the nested-wrapper case.
    const newLevel = group.promoted ? (containerLevel ?? concept.level) : concept.level;
    return { ...concept, id: newId, parentId: newParentId, level: newLevel, relations };
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
        // A `sibling` group's wrapper replaces the materialized container at
        // its own level and position (parentOfContainer/level=containerLevel);
        // a nested group's wrapper sits one level below it, inside it.
        level: g.sibling ? (containerLevel ?? "container") : wrapperLevel,
        parentId: g.sibling ? parentOfContainer! : plan.containerId,
        relations: relations.length > 0 ? relations : undefined,
        sourceFiles: [],
      };
    });

  // Once every group has been promoted/sibling'd out from under it, the
  // original materialized container concept is left with zero children —
  // drop it entirely rather than leaving an empty, pointless leaf node (see
  // MaterializationPlan.dissolvesOriginal's doc comment).
  const survivors = plan.dissolvesOriginal
    ? rewritten.filter((c) => c.id !== plan.containerId)
    : rewritten;

  return [...survivors, ...newContainers];
}

export interface MaterializationProposal {
  containerPlans: MaterializationPlan[];
  actorProposals: ActorProposal[];
}

const PROPOSAL_FILENAME = ".materialize-proposal.json";

export function proposalPath(bundleDir: string): string {
  return path.join(bundleDir, PROPOSAL_FILENAME);
}

function singleRootConceptId(concepts: ConceptFacts[]): string | null {
  const topLevel = concepts.filter((c) => c.parentId === null);
  return topLevel.length === 1 ? topLevel[0].id : null;
}

/**
 * Computes what materialization *would* do, without writing any concept
 * markdown or touching the manifest — the propose half of the review flow.
 */
export async function proposeMaterialization(
  scanResult: ScanResult,
  organizer: OrganizerClient,
  actorClient: ActorInferenceClient,
  alreadyMaterialized: Set<string>,
): Promise<MaterializationProposal> {
  const byParent = new Map<string, ConceptFacts[]>();
  for (const c of scanResult.concepts) {
    if (c.parentId === null || alreadyMaterialized.has(c.parentId)) continue;
    byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
  }

  const containerPlans: MaterializationPlan[] = [];
  for (const [containerId, children] of byParent) {
    if (children.length < MATERIALIZE_MIN_CHILDREN) continue;
    const assignments = await organizer.organizeChildren(
      containerId,
      children.map((c) => ({ facts: c })),
    );
    const plan = computeMaterializationPlan(containerId, children, assignments, scanResult.concepts);
    if (plan) containerPlans.push(plan);
  }

  const actorProposals = await actorClient.inferActors(scanResult.concepts);
  return { containerPlans, actorProposals };
}

/**
 * Applies a (possibly hand-edited) proposal to a ScanResult, producing a new
 * one with capability containers materialized and actor concepts added. Pure
 * — the caller is responsible for feeding the result into synthesize() to
 * actually write markdown.
 *
 * Relation direction for actors is decided here, by type, not by the LLM
 * (see actors.ts's design note): a Person actor gets its own outgoing
 * relation to the bundle's single root concept; an External System actor
 * gets no relations of its own — instead the root concept gains an outgoing
 * relation *to* it. Both only happen when the bundle has exactly one
 * top-level concept; otherwise the actor is still added, just unwired.
 */
export function applyMaterializationProposal(scanResult: ScanResult, proposal: MaterializationProposal): ScanResult {
  let concepts = scanResult.concepts;
  for (const plan of proposal.containerPlans) {
    concepts = applyMaterializationPlan(concepts, plan);
  }

  const rootId = singleRootConceptId(concepts);
  const actorConcepts: ConceptFacts[] = [];
  const usedActorIds = new Set(concepts.map((c) => c.id));
  for (const actor of proposal.actorProposals) {
    const baseActorId = slugify(actor.title);
    let actorId = baseActorId;
    let suffix = 2;
    while (usedActorIds.has(actorId)) {
      actorId = `${baseActorId}-${suffix}`;
      suffix++;
    }
    usedActorIds.add(actorId);
    if (actor.type === "Person") {
      actorConcepts.push({
        id: actorId,
        type: "Person",
        level: "context",
        parentId: null,
        external: true,
        relations: rootId
          ? [{ targetId: rootId, label: actor.relationLabel, kind: actor.relationKind, evidence: actor.relationLabel }]
          : undefined,
        sourceFiles: [],
      });
    } else {
      actorConcepts.push({
        id: actorId,
        type: "External System",
        level: "context",
        parentId: null,
        external: true,
        sourceFiles: [],
      });
      if (rootId) {
        concepts = concepts.map((c) =>
          c.id === rootId
            ? {
                ...c,
                relations: [
                  ...(c.relations ?? []),
                  { targetId: actorId, label: actor.relationLabel, kind: actor.relationKind, evidence: actor.relationLabel },
                ],
              }
            : c,
        );
      }
    }
  }

  return { ...scanResult, concepts: [...concepts, ...actorConcepts] };
}

export async function writeProposal(bundleDir: string, proposal: MaterializationProposal): Promise<void> {
  await writeFile(proposalPath(bundleDir), `${JSON.stringify(proposal, null, 2)}\n`, "utf-8");
}

export async function readProposal(bundleDir: string): Promise<MaterializationProposal> {
  const raw = await readFile(proposalPath(bundleDir), "utf-8");
  return JSON.parse(raw) as MaterializationProposal;
}
