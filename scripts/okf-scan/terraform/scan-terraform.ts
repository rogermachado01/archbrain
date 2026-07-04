import { readdir } from "node:fs/promises";
import path from "node:path";
import { ROOT_CONTEXT_ID, type ConceptFacts, type Environment, type GroupFact, type RepoMapConfig, type ScanResult } from "../types";
import { parseTerraformDir } from "./hcl";
import { resourceTypeInfo } from "./resource-types";

type TfBlock = Record<string, unknown>;

function getResourceBlocks(raw: Record<string, unknown>, tfType: string): Record<string, TfBlock[]> {
  const resourceSection = (raw.resource ?? {}) as Record<string, Record<string, TfBlock[]>>;
  return resourceSection[tfType] ?? {};
}

interface Reference {
  type: string;
  name: string;
  attr: string;
}

/** Extracts every `${type.name.attr}` interpolation reference found anywhere inside a value. */
function findReferences(value: unknown, refs: Reference[] = []): Reference[] {
  if (typeof value === "string") {
    const re = /\$\{([a-z0-9_]+)\.([a-z0-9_-]+)\.([a-z0-9_]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(value))) refs.push({ type: m[1], name: m[2], attr: m[3] });
  } else if (Array.isArray(value)) {
    value.forEach((v) => findReferences(v, refs));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => findReferences(v, refs));
  }
  return refs;
}

function schemaFromAttrs(attrs: TfBlock, skip: Set<string>): Record<string, string | number | boolean> {
  const schema: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (skip.has(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      schema[key] = value;
    }
  }
  return schema;
}

export async function scanTerraform(config: RepoMapConfig["terraform"], env: Environment): Promise<ScanResult> {
  const entries = await readdir(config.path);
  const excludedEnvFiles = new Set(
    Object.entries(config.envFiles)
      .filter(([e]) => e !== env)
      .map(([, file]) => file)
  );
  const files = entries.filter((f) => f.endsWith(".tf") && !excludedEnvFiles.has(f)).sort();
  const sourceFiles = files.map((f) => path.join(config.path, f));
  const { raw } = await parseTerraformDir(config.path, files);

  const concepts: ConceptFacts[] = [];
  const groups: GroupFact[] = [];
  const lambdaEnvVarBindings: Record<string, Record<string, string>> = {};

  for (const [name] of Object.entries(getResourceBlocks(raw, "aws_vpc"))) {
    groups.push({ id: `vpc-${name}`, kind: "vpc", name, parentGroupId: null });
  }

  for (const [name, instances] of Object.entries(getResourceBlocks(raw, "aws_subnet"))) {
    const attrs = instances[0] ?? {};
    const vpcRef = findReferences(attrs.vpc_id).find((r) => r.type === "aws_vpc");
    const az = typeof attrs.availability_zone === "string" ? attrs.availability_zone : undefined;
    groups.push({
      id: `subnet-${name}`,
      kind: "subnet",
      name: az ? `${name} (${az})` : name,
      parentGroupId: vpcRef ? `vpc-${vpcRef.name}` : null,
      subnetType: name.toLowerCase().includes("private") ? "private" : "public",
    });
  }

  for (const [name, instances] of Object.entries(getResourceBlocks(raw, "aws_lambda_function"))) {
    const attrs = instances[0] ?? {};
    const info = resourceTypeInfo("aws_lambda_function")!;
    const relations: NonNullable<ConceptFacts["relations"]> = [];
    const needsReview: string[] = [];

    const envBlock = (attrs.environment as { variables?: Record<string, unknown> }[] | undefined)?.[0];
    const bindings: Record<string, string> = {};
    for (const [varName, varValue] of Object.entries(envBlock?.variables ?? {})) {
      const refs = findReferences(varValue);
      if (refs.length === 1) {
        bindings[varName] = `${refs[0].type}.${refs[0].name}`;
        relations.push({
          targetId: refs[0].name,
          evidence: `environment.variables.${varName} bound to \${${refs[0].type}.${refs[0].name}.${refs[0].attr}} in Terraform`,
        });
      } else if (refs.length > 1) {
        needsReview.push(`environment.variables.${varName} references more than one resource: ${JSON.stringify(varValue)}`);
      }
    }
    lambdaEnvVarBindings[name] = bindings;

    concepts.push({
      id: name,
      type: info.label,
      awsResourceType: info.label,
      level: "container",
      parentId: ROOT_CONTEXT_ID,
      schema: schemaFromAttrs(attrs, new Set(["environment", "depends_on"])),
      relations,
      groupId: null,
      sourceFiles,
      needsReview: needsReview.length > 0 ? needsReview : undefined,
    });
  }

  for (const tfType of ["aws_dynamodb_table", "aws_sqs_queue", "aws_sns_topic"] as const) {
    const info = resourceTypeInfo(tfType);
    if (!info) continue;
    for (const [name, instances] of Object.entries(getResourceBlocks(raw, tfType))) {
      concepts.push({
        id: name,
        type: info.label,
        awsResourceType: info.label,
        level: "container",
        parentId: ROOT_CONTEXT_ID,
        schema: schemaFromAttrs(instances[0] ?? {}, new Set()),
        groupId: null,
        sourceFiles,
      });
    }
  }

  return { concepts, groups, lambdaEnvVarBindings };
}
