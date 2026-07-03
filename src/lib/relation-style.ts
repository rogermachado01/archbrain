import type { ArchRelation, RelationKind } from "./types";

export interface RelationStyle {
  kind: RelationKind;
  label: string;
  stroke: string;
  dash?: string;
  opacity?: number;
}

export const RELATION_STYLES: Record<RelationKind, RelationStyle> = {
  sync: { kind: "sync", label: "Synchronous call", stroke: "#5a6b82" },
  "async-event": { kind: "async-event", label: "Asynchronous event", stroke: "#1168bd", dash: "5,4" },
  compensation: { kind: "compensation", label: "Compensating transaction", stroke: "#c0392b", dash: "2,3" },
};

/** Fixed legend descriptor for rolled-up edges (see getRelationsForViewWithRollup in model.ts). */
export const AGGREGATED_RELATION_LEGEND = {
  label: "Relação agregada (nível inferior)",
  stroke: "#5a6b82",
  opacity: 0.55,
};

/** Opacity applied to aggregated edges, layered on top of their kind's color/dash. */
const AGGREGATED_OPACITY = 0.55;

/** Falls back through the legacy `async` boolean when `kind` isn't set. */
export function resolveRelationKind(rel: ArchRelation): RelationKind {
  if (rel.kind) return rel.kind;
  return rel.async ? "async-event" : "sync";
}

export function getRelationStyle(rel: ArchRelation): RelationStyle {
  const base = RELATION_STYLES[resolveRelationKind(rel)];
  return rel.aggregated ? { ...base, opacity: AGGREGATED_OPACITY } : base;
}

/** Whether any relation in the current view was synthesized by getRelationsForViewWithRollup. */
export function hasAggregatedRelations(relations: ArchRelation[]): boolean {
  return relations.some((r) => r.aggregated);
}

/** Distinct kinds present in the given relations, in a stable (sync, async-event, compensation) order. */
export function getVisibleRelationKinds(relations: ArchRelation[]): RelationStyle[] {
  const present = new Set(relations.map(resolveRelationKind));
  return (Object.keys(RELATION_STYLES) as RelationKind[])
    .filter((k) => present.has(k))
    .map((k) => RELATION_STYLES[k]);
}
