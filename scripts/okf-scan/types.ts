import type { AwsGroupKind, C4Level, RelationKind } from "../../src/lib/types";

export type Environment = "dev" | "hml" | "prd";

export interface BranchMap {
  dev: string;
  hml: string;
  prd: string;
}

export interface RepoMapConfig {
  terraform: {
    path: string;
    envFiles: { dev: string; hml: string; prd: string };
  };
  resources: Record<string, { repo: string; branch: BranchMap }>;
  frontend: { repo: string; branch: BranchMap }[];
}

/** Id of the single synthesized root "context"-level node every top-level container attaches to. */
export const ROOT_CONTEXT_ID = "platform";

/** One evidenced relation a scanner found between two concepts. */
export interface FactRelation {
  targetId: string;
  kind?: RelationKind;
  label?: string;
  /** human-readable justification, e.g. "PutItemCommand + env var ORDERS_TABLE bound in TF to aws_dynamodb_table.orders_table" */
  evidence: string;
}

/** Structured, evidence-only output of a scanner for one OKF concept. Never contains prose. */
export interface ConceptFacts {
  id: string;
  type: string;
  level: C4Level;
  parentId: string | null;
  awsResourceType?: string;
  schema?: Record<string, string | number | boolean>;
  relations?: FactRelation[];
  groupId?: string | null;
  owner?: string;
  /** absolute paths this concept's facts were derived from, used to compute inputHash */
  sourceFiles: string[];
  /** facts the scanner could not fully resolve (dynamic value, unrecognized call, etc.) */
  needsReview?: string[];
}

export interface GroupFact {
  id: string;
  kind: AwsGroupKind;
  name: string;
  parentGroupId?: string | null;
  subnetType?: "public" | "private";
}

export interface ScanResult {
  concepts: ConceptFacts[];
  groups: GroupFact[];
  /** Lambda resource name -> its Terraform environment.variables map, e.g. { ORDERS_TABLE: "aws_dynamodb_table.orders_table" } */
  lambdaEnvVarBindings: Record<string, Record<string, string>>;
}

export interface ManifestRepoEntry {
  lastScannedRef: string;
  env: Environment;
}

export interface ManifestConceptEntry {
  inputHash: string;
  facts: ConceptFacts;
  lastScannedAt: string;
}

export interface ScanManifest {
  _repos: Record<string, ManifestRepoEntry>;
  concepts: Record<string, ManifestConceptEntry>;
  /**
   * Cached from the last Terraform scan so the CLI can skip re-parsing
   * Terraform when its freshness check is unchanged, while a Lambda repo
   * that *did* change still has env-var bindings to resolve against.
   */
  lambdaEnvVarBindings?: Record<string, Record<string, string>>;
}

export function emptyManifest(): ScanManifest {
  return { _repos: {}, concepts: {} };
}
