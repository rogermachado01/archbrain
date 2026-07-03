export type C4Level = "context" | "container" | "component";

/** Semantic kind of a relation; drives edge color/dash and the legend. */
export type RelationKind = "sync" | "async-event" | "compensation";

/** AWS network-boundary box kind, nestable via AwsGroup.parentGroupId. */
export type AwsGroupKind = "region" | "vpc" | "availability-zone" | "subnet";

export interface AwsResourceConfig {
  resourceType: string;
  properties: Record<string, string | number | boolean>;
}

export interface AwsGroup {
  id: string;
  kind: AwsGroupKind;
  name: string;
  /** id of the group this one nests inside; omit/null for a root-level group */
  parentGroupId?: string | null;
  /** only meaningful when kind === "subnet" */
  subnetType?: "public" | "private";
}

export interface ArchNode {
  id: string;
  name: string;
  description?: string;
  level: C4Level;
  technology?: string;
  external?: boolean;
  /** id of the node this one is nested under; null/undefined for top-level context nodes */
  parentId?: string | null;
  aws?: AwsResourceConfig;
  /** filename under /public/aws-icons, e.g. "lambda.svg" */
  icon?: string;
  /** id of the AwsGroup (region/vpc/az/subnet) this node sits inside, if any */
  groupId?: string | null;
}

export interface ArchRelation {
  id: string;
  source: string;
  target: string;
  label?: string;
  technology?: string;
  /** legacy flag; falls back to "async-event" via resolveRelationKind when `kind` is absent */
  async?: boolean;
  /** explicit semantic kind; takes precedence over `async` when present */
  kind?: RelationKind;
}

export interface ArchModel {
  nodes: ArchNode[];
  relations: ArchRelation[];
  /** flat list of AWS network-boundary groups, nested via parentGroupId */
  groups?: AwsGroup[];
  /** title shown in the per-view header when at the root Context view */
  title?: string;
  /** description shown in the per-view header when at the root Context view */
  description?: string;
  /** custom boundary box; omit for the default "AWS Cloud" box, false to disable it */
  boundary?: { label: string; icon?: string } | false;
}
