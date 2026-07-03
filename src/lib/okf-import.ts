import { parseFrontmatter } from "./frontmatter";
import { findAwsIcon } from "./aws-icons";
import { resolveRelativePath } from "./paths";
import type { ArchModel, ArchNode, ArchRelation, AwsGroup, AwsGroupKind, C4Level, RelationKind } from "./types";

/**
 * Imports an Open Knowledge Format (OKF, see
 * https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
 * bundle into an ArchModel.
 *
 * OKF only defines documents (markdown + YAML frontmatter) organized by
 * directory hierarchy and navigated via `index.md` listings — it has no
 * concept of typed edges or C4/AWS-specific fields. This importer maps our
 * needs onto that in two ways:
 *
 * 1. Reuses OKF's own navigation mechanism: each `index.md` is a bullet list
 *    of markdown links (exactly the format OKF's real-world bundles use),
 *    and a concept's children live in a same-named subdirectory next to it
 *    (`orders-service.md` + `orders-service/index.md`) — this directory
 *    nesting becomes our `ArchNode.parentId` chain.
 * 2. Adds our own convention on top, using fields/sections OKF explicitly
 *    allows producers to add: a `# Relations` section (bullet list of
 *    `[label](link.md)` with an optional `{kind: async-event}` suffix) for
 *    typed ArchRelations, and custom frontmatter (`level`, `icon`, `group`,
 *    `aws_resource_type`, plus `kind`/`subnet_type` on group concepts) for
 *    everything OKF has no native field for.
 *
 * A concept's `icon` falls back to `findAwsIcon(type)` when omitted, so
 * bundle authors don't need to know our exact icon filenames for AWS
 * services — only Person/external-system concepts need an explicit `icon`.
 */
export async function importOkfBundle(basePath: string): Promise<ArchModel> {
  const nodes: ArchNode[] = [];
  const relations: ArchRelation[] = [];
  const groups: AwsGroup[] = [];

  async function fetchText(path: string): Promise<string> {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`OKF import: failed to fetch "${path}" (HTTP ${res.status})`);
    return res.text();
  }

  async function pathExists(path: string): Promise<boolean> {
    try {
      const res = await fetch(path);
      return res.ok;
    } catch {
      return false;
    }
  }

  function pathToId(filePath: string): string {
    let rel = filePath.startsWith(basePath) ? filePath.slice(basePath.length) : filePath;
    rel = rel.replace(/^\/+/, "").replace(/\.md$/, "").replace(/\/index$/, "");
    return rel;
  }

  function extractLinks(markdown: string): { text: string; href: string }[] {
    const links: { text: string; href: string }[] = [];
    const re = /\[([^\]]+)\]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(markdown))) {
      links.push({ text: m[1], href: m[2] });
    }
    return links;
  }

  /** Body text of a `# Heading` section, up to (not including) the next `# Heading`. */
  function extractSection(body: string, heading: string): string | null {
    const lines = body.split("\n");
    const startIdx = lines.findIndex((l) => l.trim().toLowerCase() === `# ${heading}`.toLowerCase());
    if (startIdx === -1) return null;
    const rest = lines.slice(startIdx + 1);
    const endIdx = rest.findIndex((l) => /^#\s+/.test(l));
    return (endIdx === -1 ? rest : rest.slice(0, endIdx)).join("\n").trim();
  }

  function parseSchemaSection(body: string): Record<string, string | number | boolean> {
    const section = extractSection(body, "Schema");
    if (!section) return {};
    const properties: Record<string, string | number | boolean> = {};
    section.split("\n").forEach((line) => {
      const m = line.trim().match(/^-\s*`?([A-Za-z0-9_]+)`?\s*:\s*(.+)$/);
      if (!m) return;
      const [, key, rawValue] = m;
      const value = rawValue.trim();
      if (value === "true") properties[key] = true;
      else if (value === "false") properties[key] = false;
      else if (value !== "" && !Number.isNaN(Number(value))) properties[key] = Number(value);
      else properties[key] = value;
    });
    return properties;
  }

  function parseRelationsSection(body: string, sourceId: string, dirPath: string): ArchRelation[] {
    const section = extractSection(body, "Relations");
    if (!section) return [];
    return section
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line, idx) => {
        const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (!linkMatch) return null;
        const [fullMatch, linkText, href] = linkMatch;
        // The link's own anchor text names the target concept for readability
        // (`[Order System](...)`); the actual relation label is whatever
        // prose follows it on the line (after a leading "—"), e.g. "Places
        // orders using". Falls back to the link text if none is given.
        const afterLink = line.slice(line.indexOf(fullMatch) + fullMatch.length).trim();
        const kindMatch = afterLink.match(/\{\s*kind:\s*([a-z-]+)\s*\}/i);
        const label =
          afterLink
            .replace(/\{\s*kind:\s*[a-z-]+\s*\}/i, "")
            .replace(/^[-—–]\s*/, "")
            .trim() || linkText;
        const targetId = pathToId(resolveRelativePath(dirPath, href));
        const relation: ArchRelation = {
          id: `${sourceId}__rel${idx}`,
          source: sourceId,
          target: targetId,
          label: label.trim(),
        };
        if (kindMatch) relation.kind = kindMatch[1] as RelationKind;
        return relation;
      })
      .filter((r): r is ArchRelation => r !== null);
  }

  async function loadConcept(dirPath: string, fileName: string, parentId: string | null): Promise<void> {
    const filePath = `${dirPath}/${fileName}.md`;
    const { data, content } = parseFrontmatter(await fetchText(filePath));
    const id = pathToId(filePath);

    const type = typeof data.type === "string" ? data.type : undefined;
    const explicitIcon = typeof data.icon === "string" ? data.icon : undefined;
    const groupLink = typeof data.group === "string" ? data.group : undefined;
    const awsResourceType = typeof data.aws_resource_type === "string" ? data.aws_resource_type : undefined;

    nodes.push({
      id,
      name: typeof data.title === "string" ? data.title : fileName,
      description: typeof data.description === "string" ? data.description : undefined,
      level: (typeof data.level === "string" ? data.level : "container") as C4Level,
      technology: typeof data.technology === "string" ? data.technology : type,
      external: typeof data.external === "boolean" ? data.external : undefined,
      parentId,
      icon: explicitIcon ?? (type ? findAwsIcon(type) : undefined),
      groupId: groupLink ? pathToId(resolveRelativePath(dirPath, groupLink)) : undefined,
      aws: awsResourceType ? { resourceType: awsResourceType, properties: parseSchemaSection(content) } : undefined,
    });

    relations.push(...parseRelationsSection(content, id, dirPath));

    const childDir = `${dirPath}/${fileName}`;
    if (await pathExists(`${childDir}/index.md`)) {
      await visitIndex(childDir, id);
    }
  }

  async function loadGroupConcept(dirPath: string, fileName: string, parentGroupId: string | null): Promise<void> {
    const filePath = `${dirPath}/${fileName}.md`;
    const { data } = parseFrontmatter(await fetchText(filePath));
    const id = pathToId(filePath);

    groups.push({
      id,
      kind: data.kind as AwsGroupKind,
      name: typeof data.title === "string" ? data.title : fileName,
      parentGroupId,
      subnetType: data.subnet_type as "public" | "private" | undefined,
    });

    const childDir = `${dirPath}/${fileName}`;
    if (await pathExists(`${childDir}/index.md`)) {
      await visitGroupIndex(childDir, id);
    }
  }

  async function visitIndex(dirPath: string, parentId: string | null): Promise<void> {
    const links = extractLinks(await fetchText(`${dirPath}/index.md`));
    for (const link of links) {
      if (!link.href.endsWith(".md") || link.href.endsWith("/index.md")) continue;
      const fileName = link.href.replace(/\.md$/, "").split("/").pop()!;
      await loadConcept(dirPath, fileName, parentId);
    }
  }

  async function visitGroupIndex(dirPath: string, parentGroupId: string | null): Promise<void> {
    const links = extractLinks(await fetchText(`${dirPath}/index.md`));
    for (const link of links) {
      if (!link.href.endsWith(".md") || link.href.endsWith("/index.md")) continue;
      const fileName = link.href.replace(/\.md$/, "").split("/").pop()!;
      await loadGroupConcept(dirPath, fileName, parentGroupId);
    }
  }

  const { data: rootData, content: rootContent } = parseFrontmatter(await fetchText(`${basePath}/index.md`));
  const boundary: ArchModel["boundary"] =
    rootData.boundary === false
      ? false
      : typeof rootData.boundary_label === "string"
        ? {
            label: rootData.boundary_label,
            icon: typeof rootData.boundary_icon === "string" ? rootData.boundary_icon : undefined,
          }
        : undefined;
  const rootLinks = extractLinks(rootContent);
  for (const link of rootLinks) {
    const normalizedHref = link.href.replace(/^\.\//, "");
    if (normalizedHref === "groups/index.md") {
      await visitGroupIndex(`${basePath}/groups`, null);
      continue;
    }
    if (!link.href.endsWith(".md") || link.href.endsWith("/index.md")) continue;
    const fileName = link.href.replace(/\.md$/, "").split("/").pop()!;
    await loadConcept(basePath, fileName, null);
  }

  return {
    nodes,
    relations,
    groups,
    title: typeof rootData.title === "string" ? rootData.title : undefined,
    description: typeof rootData.description === "string" ? rootData.description : undefined,
    boundary,
  };
}
