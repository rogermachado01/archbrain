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

/** Strips the file extension and a trailing "index" segment, leaving raw path segments (still `[slug]`/`[...slug]`/literal, unparsed). Shared by routeSegmentsForPageFile and routePathForPageFile. */
export function rawRouteSegments(pagesRelative: string): string[] {
  const withoutExt = pagesRelative.replace(/\.(tsx?|jsx?)$/, "");
  const segments = withoutExt.split("/").filter(Boolean);
  if (segments[segments.length - 1] === "index") segments.pop();
  return segments;
}

/**
 * Converts a page file's path (relative to `pages/`) into matchable route segments,
 * per Next.js Pages Router conventions: `[slug]` (dynamic), `[...slug]` (catch-all),
 * `[[...slug]]` (optional catch-all), and a trailing `index` naming the parent path
 * itself rather than a literal "index" segment.
 */
export function routeSegmentsForPageFile(pagesRelative: string): RouteSegment[] {
  return rawRouteSegments(pagesRelative).map(parseRouteSegment);
}

function hasNonLiteralSegment(entry: RouteTableEntry): boolean {
  return entry.segments.some((s) => s.type !== "literal");
}

/**
 * A literal segment and a dynamic one can both structurally match the same href
 * (e.g. "/about" matches both a literal "about" page and a dynamic "[slug]" page), and
 * `matchRoute` returns the first structural match in table order — so entries are
 * sorted purely-literal-first here, at build time, rather than leaving it up to
 * whatever order `pages` happens to arrive in (e.g. an alphabetical file listing sorts
 * "[slug].tsx" before "about.tsx", which would otherwise make the dynamic page win).
 */
export function buildRouteTable(pages: { conceptId: string; pagesRelative: string }[]): RouteTableEntry[] {
  const entries = pages.map((p) => ({ conceptId: p.conceptId, segments: routeSegmentsForPageFile(p.pagesRelative) }));
  return entries.sort((a, b) => Number(hasNonLiteralSegment(a)) - Number(hasNonLiteralSegment(b)));
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
