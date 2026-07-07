import path from "node:path/posix";
import { parseFrontmatter, type Frontmatter } from "../../../src/lib/frontmatter";
import { parseLinksSection } from "../../../src/lib/okf-sections";
import type { ConceptFacts, GroupFact } from "../types";
import { findFrontendIcon } from "./frontend-icons";

/** Leaf-segment id -> Title Case, e.g. "orders/handler" -> "Handler". */
export function titleize(id: string): string {
  const last = id.split("/").pop() ?? id;
  const cleaned = last.replace(/[[\]]/g, "").replace(/^\.\.\./, "");
  return cleaned.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
  const start = byId.get(groupId);
  if (!start) {
    throw new Error(`groupBundlePath: no group with id "${groupId}" found`);
  }
  const segments: string[] = [];
  const visited = new Set<string>();
  let current: GroupFact | undefined = start;
  while (current) {
    if (visited.has(current.id)) {
      throw new Error(
        `groupBundlePath: cycle detected in parentGroupId chain (revisited "${current.id}")`,
      );
    }
    visited.add(current.id);
    segments.unshift(current.id);
    current = current.parentGroupId ? byId.get(current.parentGroupId) : undefined;
  }
  return `groups/${segments.join("/")}.md`;
}

export function relativeGroupLink(sourceId: string, groups: GroupFact[], groupId: string): string {
  return relativeLinkToPath(sourceId, groupBundlePath(groups, groupId));
}

/**
 * `src/lib/frontmatter.ts`'s `parseFrontmatter` is a minimal, line-oriented
 * parser: a bare `key: value` line captures everything after the first colon
 * as the value verbatim, an *empty* value falls into its block-list branch
 * (misreading unrelated following `- item` lines as this key's list), and
 * `coerceScalar` turns a literal `"true"`/`"false"`/numeric-looking string
 * into a boolean/number instead of leaving it a string. None of that copes
 * with an embedded newline, stray leading/trailing whitespace, or a `": "`
 * sequence either. This mirrors the hand-authored bundles' own convention
 * (see e.g. `okf_version: "0.1"` in public/okf-bundles' index.md files, quoted
 * so it round-trips as a string rather than the number 0.1) by double-quoting
 * (with internal `\`/`"` escaped and real newlines escaped to literal `\n`)
 * whenever a value wouldn't otherwise round-trip correctly.
 */
function needsFrontmatterQuoting(value: string): boolean {
  if (value === "") return true;
  if (/\n/.test(value)) return true;
  if (/^\s|\s$/.test(value)) return true;
  if (value.includes(": ")) return true;
  if (value === "true" || value === "false") return true;
  if (!Number.isNaN(Number(value))) return true;
  return false;
}

function quoteFrontmatterValue(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, "\\n");
  return `"${escaped}"`;
}

function formatFrontmatterScalar(value: string | number | boolean): string {
  if (typeof value !== "string") return String(value);
  return needsFrontmatterQuoting(value) ? quoteFrontmatterValue(value) : value;
}

export function stringifyFrontmatter(data: Frontmatter): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      value.forEach((item) => lines.push(`  - ${formatFrontmatterScalar(item)}`));
    } else {
      lines.push(`${key}: ${formatFrontmatterScalar(value)}`);
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
  return {
    ddd_subdomain: typeof data.ddd_subdomain === "string" ? data.ddd_subdomain : undefined,
    ddd_context: typeof data.ddd_context === "string" ? data.ddd_context : undefined,
    ddd_role: typeof data.ddd_role === "string" ? data.ddd_role : undefined,
    links: parseLinksSection(content),
  };
}

export interface PreservedRootFile {
  title?: string;
  description?: string;
  boundary?: false;
  boundaryLabel?: string;
  boundaryIcon?: string;
}

/**
 * Mirrors readPreserved's role but for the bundle root index.md, which today
 * has no preservation at all — every field here would otherwise be silently
 * clobbered by the next scan.
 */
export function readPreservedRoot(existingRaw: string | null): PreservedRootFile {
  if (!existingRaw) return {};
  const { data } = parseFrontmatter(existingRaw);
  return {
    title: typeof data.title === "string" ? data.title : undefined,
    description: typeof data.description === "string" ? data.description : undefined,
    boundary: data.boundary === false ? false : undefined,
    boundaryLabel: typeof data.boundary_label === "string" ? data.boundary_label : undefined,
    boundaryIcon: typeof data.boundary_icon === "string" ? data.boundary_icon : undefined,
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
  // The first prose paragraph becomes the frontmatter description (shown as the
  // node/wiki subtitle); only the remaining paragraphs go into the body, so the
  // wiki page doesn't open by repeating its own description verbatim.
  const [descriptionParagraph = "", ...bodyParagraphs] = prose.split("\n\n");
  const bodyProse = bodyParagraphs.join("\n\n");
  const frontmatter: Frontmatter = {
    type: facts.type,
    title: titleize(facts.id),
    description: descriptionParagraph,
    level: facts.level,
  };
  if (typeof facts.external === "boolean") frontmatter.external = facts.external;
  if (facts.awsResourceType) {
    frontmatter.aws_resource_type = facts.awsResourceType;
  } else {
    const icon = findFrontendIcon(facts.type);
    if (icon) frontmatter.icon = icon;
  }
  if (facts.groupId) frontmatter.group = relativeGroupLink(facts.id, groups, facts.groupId);
  if (facts.owner) frontmatter.owner = facts.owner;
  if (preserved.ddd_subdomain) frontmatter.ddd_subdomain = preserved.ddd_subdomain;
  if (preserved.ddd_context) frontmatter.ddd_context = preserved.ddd_context;
  if (preserved.ddd_role) frontmatter.ddd_role = preserved.ddd_role;

  const sections = [
    bodyProse,
    buildSchemaSection(facts.schema),
    buildRelationsSection(facts, conceptTitles),
    buildLinksSection(preserved.links),
  ].filter((s) => s.length > 0);

  return `${stringifyFrontmatter(frontmatter)}\n\n${sections.join("\n\n")}\n`;
}
