import { z } from "zod";
import type { ArchModel } from "./types";

const AwsResourceConfigSchema = z.object({
  resourceType: z.string().min(1),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

const LinkSchema = z.object({
  label: z.string().min(1),
  url: z.url(),
});

const DddInfoSchema = z.object({
  subdomain: z.enum(["core", "supporting", "generic"]).optional(),
  context: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
});

const ArchNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  level: z.enum(["context", "container", "component"]),
  technology: z.string().optional(),
  external: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
  aws: AwsResourceConfigSchema.optional(),
  icon: z.string().optional(),
  groupId: z.string().nullable().optional(),
  owner: z.string().optional(),
  links: z.array(LinkSchema).optional(),
  ddd: DddInfoSchema.optional(),
});

const ArchRelationSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
  technology: z.string().optional(),
  async: z.boolean().optional(),
  kind: z.enum(["sync", "async-event", "compensation"]).optional(),
  aggregated: z.boolean().optional(),
  pattern: z
    .enum(["partnership", "shared-kernel", "customer-supplier", "conformist", "acl", "ohs", "published-language", "ohs-pl"])
    .optional(),
});

const AwsGroupSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["region", "vpc", "availability-zone", "subnet"]),
  name: z.string().min(1),
  parentGroupId: z.string().nullable().optional(),
  subnetType: z.enum(["public", "private"]).optional(),
});

const BoundarySchema = z.union([z.object({ label: z.string().min(1), icon: z.string().optional() }), z.literal(false)]);

const ArchModelSchema = z.object({
  nodes: z.array(ArchNodeSchema),
  relations: z.array(ArchRelationSchema),
  groups: z.array(AwsGroupSchema).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  boundary: BoundarySchema.optional(),
});

const LEVEL_ORDER = { context: 0, container: 1, component: 2 } as const;

/**
 * Validates an unknown value as an ArchModel in two layers: shape (via Zod)
 * and referential integrity (dangling/cyclic ids, which Zod can't express).
 * Throws a single Error aggregating every problem found, not just the first,
 * so a data author sees the whole picture in one pass.
 */
export function validateArchModel(input: unknown): ArchModel {
  const parsed = ArchModelSchema.safeParse(input);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
    throw new Error(`Invalid architecture model:\n- ${messages.join("\n- ")}`);
  }

  const model = parsed.data as ArchModel;
  const errors: string[] = [];

  const nodeIds = new Set<string>();
  model.nodes.forEach((n) => {
    if (nodeIds.has(n.id)) errors.push(`duplicate node id "${n.id}"`);
    nodeIds.add(n.id);
  });

  const nodeById = new Map(model.nodes.map((n) => [n.id, n]));
  model.nodes.forEach((n) => {
    if (n.parentId == null) return;
    if (!nodeById.has(n.parentId)) {
      errors.push(`node "${n.id}" has parentId "${n.parentId}" which does not exist`);
      return;
    }
    const parent = nodeById.get(n.parentId)!;
    if (LEVEL_ORDER[n.level] !== LEVEL_ORDER[parent.level] + 1) {
      errors.push(
        `node "${n.id}" (${n.level}) is a child of "${parent.id}" (${parent.level}) — expected level ` +
          `"${Object.keys(LEVEL_ORDER)[LEVEL_ORDER[parent.level] + 1] ?? "none"}"`
      );
    }
  });

  const parentCycleVisited = new Set<string>();
  model.nodes.forEach((n) => {
    if (parentCycleVisited.has(n.id)) return;
    const seen = new Set<string>();
    let current: typeof n | undefined = n;
    while (current) {
      if (seen.has(current.id)) {
        errors.push(`cycle in parentId chain involving node "${current.id}"`);
        break;
      }
      seen.add(current.id);
      parentCycleVisited.add(current.id);
      current = current.parentId ? nodeById.get(current.parentId) : undefined;
    }
  });

  const relationIds = new Set<string>();
  model.relations.forEach((r) => {
    if (relationIds.has(r.id)) errors.push(`duplicate relation id "${r.id}"`);
    relationIds.add(r.id);
    if (!nodeById.has(r.source)) errors.push(`relation "${r.id}" has source "${r.source}" which does not exist`);
    if (!nodeById.has(r.target)) errors.push(`relation "${r.id}" has target "${r.target}" which does not exist`);
  });

  const groups = model.groups ?? [];
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const groupIds = new Set<string>();
  groups.forEach((g) => {
    if (groupIds.has(g.id)) errors.push(`duplicate group id "${g.id}"`);
    groupIds.add(g.id);
  });
  groups.forEach((g) => {
    if (g.parentGroupId != null && !groupById.has(g.parentGroupId)) {
      errors.push(`group "${g.id}" has parentGroupId "${g.parentGroupId}" which does not exist`);
    }
  });
  const groupCycleVisited = new Set<string>();
  groups.forEach((g) => {
    if (groupCycleVisited.has(g.id)) return;
    const seen = new Set<string>();
    let current: typeof g | undefined = g;
    while (current) {
      if (seen.has(current.id)) {
        errors.push(`cycle in parentGroupId chain involving group "${current.id}"`);
        break;
      }
      seen.add(current.id);
      groupCycleVisited.add(current.id);
      current = current.parentGroupId ? groupById.get(current.parentGroupId) : undefined;
    }
  });
  model.nodes.forEach((n) => {
    if (n.groupId != null && !groupById.has(n.groupId)) {
      errors.push(`node "${n.id}" has groupId "${n.groupId}" which does not exist`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Invalid architecture model:\n- ${errors.join("\n- ")}`);
  }

  return model;
}
