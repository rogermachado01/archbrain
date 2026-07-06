import type { ConceptFacts, FactRelation } from "../types";

function leafOf(id: string): string {
  return id.split("/").pop() ?? id;
}

/**
 * "ctf-quote-gql" / "ctf-quote.generated" / "ctf-quote-gql.generated" -> "ctf-quote".
 * Returns the leaf unchanged when it carries no satellite suffix.
 */
export function satelliteBaseKey(leaf: string): string {
  let current = leaf;
  for (;;) {
    const next = current.replace(/(\.generated|-gql)$/, "");
    if (next === current) return current;
    current = next;
  }
}

/**
 * Folds GraphQL-codegen satellite concepts (leaf ending in "-gql" and/or
 * ".generated") into their base concept when that base exists as a sibling id:
 * one logical component instead of three. Relations across the whole concept
 * list are re-pointed at the primary, deduped per (source, target), and
 * intra-group edges (self-loops after the merge) are dropped. A satellite with
 * no existing primary stays standalone.
 */
export function mergeGeneratedSatellites(concepts: ConceptFacts[]): ConceptFacts[] {
  const byId = new Map(concepts.map((c) => [c.id, c]));

  const primaryOf = new Map<string, string>();
  for (const concept of concepts) {
    const leaf = leafOf(concept.id);
    const baseKey = satelliteBaseKey(leaf);
    if (baseKey === leaf) continue;
    const dir = concept.id.slice(0, concept.id.length - leaf.length);
    const primaryId = `${dir}${baseKey}`;
    const primary = byId.get(primaryId);
    if (!primary) continue;
    primaryOf.set(concept.id, primaryId);
  }
  if (primaryOf.size === 0) return concepts;

  const resolve = (id: string): string => primaryOf.get(id) ?? id;

  const merged: ConceptFacts[] = [];
  for (const concept of concepts) {
    if (primaryOf.has(concept.id)) continue;

    const satellites = concepts.filter((c) => primaryOf.get(c.id) === concept.id);
    const group = [concept, ...satellites];

    const seenTargets = new Set<string>();
    const relations: FactRelation[] = [];
    for (const rel of group.flatMap((c) => c.relations ?? [])) {
      const targetId = resolve(rel.targetId);
      if (targetId === concept.id) continue;
      if (seenTargets.has(targetId)) continue;
      seenTargets.add(targetId);
      relations.push({ ...rel, targetId });
    }

    const needsReview = group.flatMap((c) => c.needsReview ?? []);
    merged.push({
      ...concept,
      sourceFiles: group.flatMap((c) => c.sourceFiles),
      relations: relations.length > 0 || concept.relations ? relations : undefined,
      needsReview: needsReview.length > 0 ? needsReview : undefined,
    });
  }
  return merged;
}
