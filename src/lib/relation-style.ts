import type { ArchRelation, ContextMapPattern, RelationKind } from "./types";

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

/** DDD context-map relationship patterns: abbreviation shown on the edge label + full name for the legend. */
export const CONTEXT_MAP_PATTERNS: Record<ContextMapPattern, { abbrev: string; label: string }> = {
  partnership: { abbrev: "P", label: "Partnership" },
  "shared-kernel": { abbrev: "SK", label: "Shared Kernel" },
  "customer-supplier": { abbrev: "C/S", label: "Customer-Supplier" },
  conformist: { abbrev: "CF", label: "Conformist" },
  acl: { abbrev: "ACL", label: "Anti-Corruption Layer" },
  ohs: { abbrev: "OHS", label: "Open Host Service" },
  "published-language": { abbrev: "PL", label: "Published Language" },
  "ohs-pl": { abbrev: "OHS/PL", label: "Open Host Service / Published Language" },
};

/** Relation label with the DDD context-map pattern abbreviation appended, e.g. "Charges order [ACL]". */
export function formatRelationLabel(rel: ArchRelation): string | undefined {
  const patternInfo = rel.pattern ? CONTEXT_MAP_PATTERNS[rel.pattern] : undefined;
  if (!patternInfo) return rel.label;
  return rel.label ? `${rel.label} [${patternInfo.abbrev}]` : `[${patternInfo.abbrev}]`;
}

/** Distinct DDD context-map patterns present in the given relations, in ContextMapPattern key order. */
export function getVisiblePatterns(relations: ArchRelation[]): { pattern: ContextMapPattern; abbrev: string; label: string }[] {
  const present = new Set(relations.map((r) => r.pattern).filter((p): p is ContextMapPattern => Boolean(p)));
  return (Object.keys(CONTEXT_MAP_PATTERNS) as ContextMapPattern[])
    .filter((p) => present.has(p))
    .map((p) => ({ pattern: p, ...CONTEXT_MAP_PATTERNS[p] }));
}
