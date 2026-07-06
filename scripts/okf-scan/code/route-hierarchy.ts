import type { ConceptFacts } from "../types";

export const SHARED_UI_LEAF = "shared-ui";
const PAGE_TYPE = "Next.js Page";

/**
 * Restructures one frontend container's flat concept list into the C4 shape the
 * hand-authored webapp bundle uses (and validate-model.ts's strict one-level
 * nesting requires): the app becomes a context-level system, each Next.js page
 * becomes a drillable container (the user path), and every other component is
 * re-parented under the single page whose static-import graph reaches it — or
 * under a synthetic "shared-ui" container when 0 or 2+ pages reach it. Concept
 * ids double as bundle file paths, so re-parented components are re-id'd to
 * `<newParentId>/<leaf>` and every relation target in the list is rewritten
 * through the same map. A container with no pages is returned unchanged.
 */
export function buildRouteHierarchy(concepts: ConceptFacts[], containerId: string): ConceptFacts[] {
  const pages = concepts.filter((c) => c.parentId === containerId && c.type === PAGE_TYPE);
  if (pages.length === 0) return concepts;
  if (!concepts.some((c) => c.id === containerId)) return concepts;

  const byId = new Map(concepts.map((c) => [c.id, c]));
  const componentIds = new Set(
    concepts.filter((c) => c.parentId === containerId && c.type !== PAGE_TYPE).map((c) => c.id),
  );

  const sharedUiId = `${containerId}/${SHARED_UI_LEAF}`;
  if (byId.has(sharedUiId)) {
    throw new Error(
      `buildRouteHierarchy: concept id "${sharedUiId}" already exists — cannot create the shared-ui container`,
    );
  }

  // BFS per page over composition edges (relations targeting another scanned
  // non-page component of this same container).
  const reachedBy = new Map<string, Set<string>>();
  for (const p of pages) {
    const queue = (p.relations ?? []).map((r) => r.targetId).filter((t) => componentIds.has(t));
    const visited = new Set<string>(queue);
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      reachedBy.set(id, (reachedBy.get(id) ?? new Set()).add(p.id));
      for (const rel of byId.get(id)?.relations ?? []) {
        if (componentIds.has(rel.targetId) && !visited.has(rel.targetId)) {
          visited.add(rel.targetId);
          queue.push(rel.targetId);
        }
      }
    }
  }

  const parentFor = (componentId: string): string => {
    const pageIds = reachedBy.get(componentId);
    return pageIds?.size === 1 ? [...pageIds][0] : sharedUiId;
  };

  const idMap = new Map<string, string>();
  for (const id of componentIds) idMap.set(id, `${parentFor(id)}/${id.split("/").pop()}`);

  const rewriteRelations = (c: ConceptFacts): ConceptFacts =>
    c.relations
      ? { ...c, relations: c.relations.map((r) => ({ ...r, targetId: idMap.get(r.targetId) ?? r.targetId })) }
      : c;

  const pageIdSet = new Set(pages.map((p) => p.id));
  let sharedUiHasMembers = false;
  const result: ConceptFacts[] = [];
  for (const concept of concepts) {
    if (concept.id === containerId) {
      result.push(rewriteRelations({ ...concept, level: "context", parentId: null }));
    } else if (pageIdSet.has(concept.id)) {
      result.push(rewriteRelations({ ...concept, level: "container" }));
    } else if (componentIds.has(concept.id)) {
      const parentId = parentFor(concept.id);
      if (parentId === sharedUiId) sharedUiHasMembers = true;
      const usedByRoutes = [...(reachedBy.get(concept.id) ?? [])]
        .map((pageId) => byId.get(pageId)?.routePath)
        .filter((r): r is string => typeof r === "string")
        .sort();
      result.push(
        rewriteRelations({
          ...concept,
          id: idMap.get(concept.id)!,
          parentId,
          usedByRoutes: usedByRoutes.length > 0 ? usedByRoutes : undefined,
        }),
      );
    } else {
      result.push(rewriteRelations(concept));
    }
  }

  if (sharedUiHasMembers) {
    result.push({
      id: sharedUiId,
      type: "Shared UI & Utilities",
      level: "container",
      parentId: containerId,
      sourceFiles: [],
    });
  }
  return result;
}
