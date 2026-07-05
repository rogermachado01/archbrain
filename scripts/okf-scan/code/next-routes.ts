import path from "node:path";

const RESERVED_PAGE_FILES = new Set(["_app", "_document", "_error", "404", "500"]);

export type RouteSegment =
  | { type: "literal"; value: string }
  | { type: "dynamic" }
  | { type: "catch-all" }
  | { type: "optional-catch-all" };

export interface RouteTableEntry {
  conceptId: string;
  segments: RouteSegment[];
}

/**
 * `filePath`'s path relative to `repoDir`'s `pages/` (or `src/pages/`) directory, or
 * undefined if it isn't under one. Slash-normalized so this works the same on Windows
 * and POSIX, matching the convention `scripts/okf-scan/git/worktree.ts` already uses
 * for the same reason.
 */
export function pagesRelativePath(filePath: string, repoDir: string): string | undefined {
  const relative = path.relative(repoDir, filePath).replace(/\\/g, "/");
  const match = relative.match(/^(?:src\/)?pages\/(.+)$/);
  return match?.[1];
}

export function isReservedPageFile(pagesRelative: string): boolean {
  const withoutExt = pagesRelative.replace(/\.(tsx?|jsx?)$/, "");
  const base = withoutExt.split("/").pop() ?? withoutExt;
  return RESERVED_PAGE_FILES.has(base);
}

function parseRouteSegment(raw: string): RouteSegment {
  if (/^\[\[\.\.\..+\]\]$/.test(raw)) return { type: "optional-catch-all" };
  if (/^\[\.\.\..+\]$/.test(raw)) return { type: "catch-all" };
  if (/^\[.+\]$/.test(raw)) return { type: "dynamic" };
  return { type: "literal", value: raw };
}

/**
 * Converts a page file's path (relative to `pages/`) into matchable route segments,
 * per Next.js Pages Router conventions: `[slug]` (dynamic), `[...slug]` (catch-all),
 * `[[...slug]]` (optional catch-all), and a trailing `index` naming the parent path
 * itself rather than a literal "index" segment.
 */
export function routeSegmentsForPageFile(pagesRelative: string): RouteSegment[] {
  const withoutExt = pagesRelative.replace(/\.(tsx?|jsx?)$/, "");
  const rawSegments = withoutExt.split("/").filter(Boolean);
  if (rawSegments[rawSegments.length - 1] === "index") rawSegments.pop();
  return rawSegments.map(parseRouteSegment);
}

export function buildRouteTable(pages: { conceptId: string; pagesRelative: string }[]): RouteTableEntry[] {
  return pages.map((p) => ({ conceptId: p.conceptId, segments: routeSegmentsForPageFile(p.pagesRelative) }));
}

function matchesRoute(hrefSegments: string[], segments: RouteSegment[]): boolean {
  let i = 0;
  for (const seg of segments) {
    if (seg.type === "literal") {
      if (hrefSegments[i] !== seg.value) return false;
      i++;
    } else if (seg.type === "dynamic") {
      if (hrefSegments[i] === undefined) return false;
      i++;
    } else if (seg.type === "catch-all") {
      return i < hrefSegments.length;
    } else {
      return true; // optional-catch-all: matches zero or more remaining segments
    }
  }
  return i === hrefSegments.length;
}

/**
 * Matches a literal href/router.push path (query string and fragment stripped)
 * against a route table, returning the matching page's conceptId, or undefined if no
 * route matches.
 */
export function matchRoute(hrefPath: string, routeTable: RouteTableEntry[]): string | undefined {
  const hrefSegments = hrefPath.split(/[?#]/)[0].split("/").filter(Boolean);
  return routeTable.find((entry) => matchesRoute(hrefSegments, entry.segments))?.conceptId;
}
