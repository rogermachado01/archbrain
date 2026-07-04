import path from "node:path/posix";
import { parseFrontmatter, type Frontmatter } from "../../../src/lib/frontmatter";
import type { ConceptFacts, GroupFact } from "../types";

/** Leaf-segment id -> Title Case, e.g. "orders/handler" -> "Handler". */
export function titleize(id: string): string {
  const last = id.split("/").pop() ?? id;
  return last.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeLinkToPath(sourceId: string, targetPath: string): string {
  const sourceDir = path.dirname(sourceId);
  const fromDir = sourceDir === "." ? "" : sourceDir;
  return path.relative(fromDir, targetPath);
}

/**
 * A concept's id doubles as its file path minus `.md` (e.g. "orders/handler"
 * -> "orders/handler.md"), so the markdown link from one concept to another
 * is just a relative-path computation between the two ids.
 */
export function relativeLinkFromTo(sourceId: string, targetId: string): string {
  return relativeLinkToPath(sourceId, `${targetId}.md`);
}

/**
 * A group's bundle-relative path depends on its parentGroupId chain (each
 * level nests in its own directory, matching writeGroupFiles/okf-import.ts's
 * convention), unlike a concept id, which already *is* its own path.
 */
export function groupBundlePath(groups: GroupFact[], groupId: string): string {
  const byId = new Map(groups.map((g) => [g.id, g]));
  const segments: string[] = [];
  let current = byId.get(groupId);
  while (current) {
    segments.unshift(current.id);
    current = current.parentGroupId ? byId.get(current.parentGroupId) : undefined;
  }
  return `groups/${segments.join("/")}.md`;
}

export function relativeGroupLink(sourceId: string, groups: GroupFact[], groupId: string): string {
  return relativeLinkToPath(sourceId, groupBundlePath(groups, groupId));
}

function stringifyFrontmatter(data: Frontmatter): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      value.forEach((item) => lines.push(`  - ${item}`));
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function buildSchemaSection(schema: Record<string, string | number | boolean> | undefined): string {
  if (!schema || Object.keys(schema).length === 0) return "";
  const lines = Object.entries(schema).map(([key, value]) => `- ${key}: ${value}`);
  return ["# Schema", "", ...lines].join("\n");
}

function buildRelationsSection(facts: ConceptFacts, conceptTitles: Record<string, string>): string {
  if (!facts.relations || facts.relations.length === 0) return "";
  const lines = facts.relations.map((rel) => {
    const suffix = rel.kind ? ` {kind: ${rel.kind}}` : "";
    const linkText = conceptTitles[rel.targetId] ?? rel.targetId;
    const linkPath = relativeLinkFromTo(facts.id, rel.targetId);
    return `- [${linkText}](${linkPath}) — ${rel.label ?? rel.evidence}${suffix}`;
  });
  return ["# Relations", "", ...lines].join("\n");
}

function buildLinksSection(links: { label: string; url: string }[]): string {
  if (links.length === 0) return "";
  return ["# Links", "", ...links.map((l) => `- [${l.label}](${l.url})`)].join("\n");
}

export interface ExistingConceptFile {
  ddd_subdomain?: string;
  ddd_context?: string;
  ddd_role?: string;
  links: { label: string; url: string }[];
}

/** Reads whatever ddd_* fields / Links data a previously-generated file has, so a re-scan doesn't discard hand curation. */
export function readPreserved(existingRaw: string | null): ExistingConceptFile {
  if (!existingRaw) return { links: [] };
  const { data, content } = parseFrontmatter(existingRaw);
  const linksSection = content.split(/\n(?=# )/).find((s) => s.trim().startsWith("# Links"));
  const links: { label: string; url: string }[] = [];
  if (linksSection) {
    const re = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(linksSection))) links.push({ label: m[1], url: m[2] });
  }
  return {
    ddd_subdomain: typeof data.ddd_subdomain === "string" ? data.ddd_subdomain : undefined,
    ddd_context: typeof data.ddd_context === "string" ? data.ddd_context : undefined,
    ddd_role: typeof data.ddd_role === "string" ? data.ddd_role : undefined,
    links,
  };
}

export interface BuildConceptMarkdownOptions {
  facts: ConceptFacts;
  prose: string;
  preserved: ExistingConceptFile;
  /** id -> display title, for writing readable relation link text */
  conceptTitles: Record<string, string>;
  /** every group in the bundle, needed to resolve facts.groupId into a `group:` frontmatter link */
  groups: GroupFact[];
}

export function buildConceptMarkdown(options: BuildConceptMarkdownOptions): string {
  const { facts, prose, preserved, conceptTitles, groups } = options;
  const frontmatter: Frontmatter = {
    type: facts.type,
    title: titleize(facts.id),
    description: prose.split("\n\n")[0] ?? "",
    level: facts.level,
  };
  if (facts.awsResourceType) frontmatter.aws_resource_type = facts.awsResourceType;
  if (facts.groupId) frontmatter.group = relativeGroupLink(facts.id, groups, facts.groupId);
  if (facts.owner) frontmatter.owner = facts.owner;
  if (preserved.ddd_subdomain) frontmatter.ddd_subdomain = preserved.ddd_subdomain;
  if (preserved.ddd_context) frontmatter.ddd_context = preserved.ddd_context;
  if (preserved.ddd_role) frontmatter.ddd_role = preserved.ddd_role;

  const sections = [
    prose,
    buildSchemaSection(facts.schema),
    buildRelationsSection(facts, conceptTitles),
    buildLinksSection(preserved.links),
  ].filter((s) => s.length > 0);

  return `${stringifyFrontmatter(frontmatter)}\n\n${sections.join("\n\n")}\n`;
}
