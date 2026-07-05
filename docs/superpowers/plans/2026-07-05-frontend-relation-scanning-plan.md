# Frontend Relation Scanning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `scan-frontend-repo.ts` real, evidence-based relation detection (page
detection, component-composition via imports, page-to-page navigation via
Link/router.push) plus LLM-enriched relation labels, so the `blog` OKF bundle's diagram
and Wiki actually show the user's flow through the app instead of zero relations.

**Architecture:** Two new, independently-testable pure modules
(`scripts/okf-scan/code/next-routes.ts` for route parsing/matching,
`scripts/okf-scan/code/module-resolution.ts` for tsconfig-aware import resolution) get
wired into `scan-frontend-repo.ts`'s existing per-file AST walk via a two-pass scan
(pass 1 discovers every concept file + builds a route table, pass 2 resolves
relations against that already-known set). Separately, `llm.ts`'s
`describeConcept` return type gains a `relationLabels` array alongside `prose`,
and `synthesize.ts` uses it to enrich (never replace or add) each relation's label
before writing markdown.

**Tech Stack:** TypeScript Compiler API (`typescript` package, already a dependency),
Vitest, `@anthropic-ai/sdk` (already wired up in `llm.ts`).

**Design doc:** `docs/superpowers/specs/2026-07-05-frontend-relation-scanning-design.md`

---

## Task 1: Fixture repos for page/composition/navigation scanning

**Files:**
- Create: `scripts/okf-scan/code/__fixtures__/nextjs-repo/tsconfig.json`
- Create: `scripts/okf-scan/code/__fixtures__/nextjs-repo/src/pages/index.tsx`
- Create: `scripts/okf-scan/code/__fixtures__/nextjs-repo/src/pages/about.tsx`
- Create: `scripts/okf-scan/code/__fixtures__/nextjs-repo/src/pages/[slug].tsx`
- Create: `scripts/okf-scan/code/__fixtures__/nextjs-repo/src/pages/_app.tsx`
- Create: `scripts/okf-scan/code/__fixtures__/nextjs-repo/src/components/layout.tsx`
- Create: `scripts/okf-scan/code/__fixtures__/nextjs-repo/src/components/header.tsx`
- Create: `scripts/okf-scan/code/__fixtures__/nextjs-repo/src/components/footer.tsx`
- Create: `scripts/okf-scan/code/__fixtures__/nextjs-repo/src/lib/helpers.ts`
- Create: `scripts/okf-scan/code/__fixtures__/repo-with-tsconfig/tsconfig.json`
- Create: `scripts/okf-scan/code/__fixtures__/repo-with-tsconfig/consumer.ts`
- Create: `scripts/okf-scan/code/__fixtures__/repo-with-tsconfig/lib/thing.ts`
- Create: `scripts/okf-scan/code/__fixtures__/repo-with-tsconfig/lib/consumer.ts`

This is scaffolding, not production code — no red/green cycle, just file creation. Later
tasks' tests read these files.

- [ ] **Step 1: Create the `nextjs-repo` fixture's tsconfig**

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@src/*": ["./src/*"]
    },
    "moduleResolution": "node"
  }
}
```

- [ ] **Step 2: Create the home page (default-exported, imports `Layout` via the `@src/*` alias)**

`scripts/okf-scan/code/__fixtures__/nextjs-repo/src/pages/index.tsx`:

```tsx
import Layout from '@src/components/layout';

const HomePage = () => {
  return <Layout />;
};

export default HomePage;
```

- [ ] **Step 3: Create the about page (default-exported, no imports of other concepts — a plain navigation target)**

`scripts/okf-scan/code/__fixtures__/nextjs-repo/src/pages/about.tsx`:

```tsx
const AboutPage = () => {
  return null;
};

export default AboutPage;
```

- [ ] **Step 4: Create the dynamic slug page (default-exported, a navigation target for a dynamic route)**

`scripts/okf-scan/code/__fixtures__/nextjs-repo/src/pages/[slug].tsx`:

```tsx
const SlugPage = () => {
  return null;
};

export default SlugPage;
```

- [ ] **Step 5: Create the reserved `_app.tsx` (must never be scanned as a page or component)**

`scripts/okf-scan/code/__fixtures__/nextjs-repo/src/pages/_app.tsx`:

```tsx
function MyApp({ Component, pageProps }: { Component: any; pageProps: any }) {
  return <Component {...pageProps} />;
}

export default MyApp;
```

- [ ] **Step 6: Create `Header`, a real composed component (relation target for the relative-import test)**

`scripts/okf-scan/code/__fixtures__/nextjs-repo/src/components/header.tsx`:

```tsx
export function Header() {
  return null;
}
```

- [ ] **Step 7: Create `Footer`, used only via a type-only import (proves type-only imports don't create relations)**

`scripts/okf-scan/code/__fixtures__/nextjs-repo/src/components/footer.tsx`:

```tsx
export function Footer() {
  return null;
}
```

- [ ] **Step 8: Create a plain (non-component) utility module, an import target that resolves fine but isn't a scanned concept**

`scripts/okf-scan/code/__fixtures__/nextjs-repo/src/lib/helpers.ts`:

```ts
export function formatDate(value: string): string {
  return value;
}
```

- [ ] **Step 9: Create `Layout`, exercising every relation-detection case in one file**

`scripts/okf-scan/code/__fixtures__/nextjs-repo/src/components/layout.tsx`:

```tsx
import Link from 'next/link';
import type { Footer } from './footer';
import { Header } from './header';
import { formatDate } from '../lib/helpers';
import { SomeWidget } from 'some-external-ui-lib';

export function Layout() {
  formatDate('2026-01-01');
  return (
    <div>
      <Header />
      <SomeWidget />
      <Link href="/about">About</Link>
      <Link href="/deeply/nested/missing">Missing</Link>
    </div>
  );
}

export function navigate(router: { push: (path: string) => void }, slug: string) {
  router.push('/some-post');
  router.push(`/blog/${slug}`);
}
```

This file, once scanned, must produce:
- a composition relation to `header` (relative import of a real component)
- **no** relation from the `type { Footer }` import (type-only)
- **no** relation and **no** `needsReview` from `some-external-ui-lib` (unresolvable — an
  external package name that doesn't exist anywhere on this machine)
- **no** relation and **no** `needsReview` from `../lib/helpers` (resolves fine, but
  `formatDate` isn't a scanned concept)
- a navigation relation to the `about` page (`<Link href="/about">`)
- a `needsReview` note for `<Link href="/deeply/nested/missing">` (no page matches —
  more segments than any route in this fixture can match, including the dynamic
  `[slug]` page, which only ever consumes exactly one segment)
- a navigation relation to the `[slug]` page from `router.push('/some-post')` (a
  literal that matches the dynamic route)
- a `needsReview` note for `` router.push(`/blog/${slug}`) `` (interpolated, not a
  static literal)

- [ ] **Step 10: Create the `repo-with-tsconfig` fixture (for `module-resolution.ts`'s own tests)**

`scripts/okf-scan/code/__fixtures__/repo-with-tsconfig/tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@app/*": ["./lib/*"]
    },
    "moduleResolution": "node"
  }
}
```

`scripts/okf-scan/code/__fixtures__/repo-with-tsconfig/lib/thing.ts`:

```ts
export const thing = "thing";
```

`scripts/okf-scan/code/__fixtures__/repo-with-tsconfig/lib/consumer.ts`:

```ts
export {};
```

`scripts/okf-scan/code/__fixtures__/repo-with-tsconfig/consumer.ts`:

```ts
export {};
```

- [ ] **Step 11: Commit**

```bash
git add scripts/okf-scan/code/__fixtures__/nextjs-repo scripts/okf-scan/code/__fixtures__/repo-with-tsconfig
git commit -m "test: add fixture repos for page/composition/navigation relation scanning"
```

---

## Task 2: `next-routes.ts` — route parsing and matching (pure, no filesystem I/O)

**Files:**
- Create: `scripts/okf-scan/code/next-routes.ts`
- Test: `scripts/okf-scan/code/next-routes.test.ts`

- [ ] **Step 1: Write the failing tests**

`scripts/okf-scan/code/next-routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildRouteTable,
  isReservedPageFile,
  matchRoute,
  pagesRelativePath,
  routeSegmentsForPageFile,
} from "./next-routes";

describe("pagesRelativePath", () => {
  it("returns the path relative to src/pages/", () => {
    expect(pagesRelativePath("/repo/src/pages/about.tsx", "/repo")).toBe("about.tsx");
  });

  it("returns the path relative to a bare pages/ (no src/) directory", () => {
    expect(pagesRelativePath("/repo/pages/about.tsx", "/repo")).toBe("about.tsx");
  });

  it("returns undefined for a file outside any pages/ directory", () => {
    expect(pagesRelativePath("/repo/src/components/header.tsx", "/repo")).toBeUndefined();
  });
});

describe("isReservedPageFile", () => {
  it("flags Next.js's reserved page files", () => {
    expect(isReservedPageFile("_app.tsx")).toBe(true);
    expect(isReservedPageFile("_document.tsx")).toBe(true);
    expect(isReservedPageFile("404.tsx")).toBe(true);
  });

  it("does not flag an ordinary page file", () => {
    expect(isReservedPageFile("about.tsx")).toBe(false);
  });
});

describe("routeSegmentsForPageFile", () => {
  it("maps index.tsx to the root (no segments)", () => {
    expect(routeSegmentsForPageFile("index.tsx")).toEqual([]);
  });

  it("maps a literal file to a single literal segment", () => {
    expect(routeSegmentsForPageFile("about.tsx")).toEqual([{ type: "literal", value: "about" }]);
  });

  it("maps a dynamic [slug].tsx to a dynamic segment", () => {
    expect(routeSegmentsForPageFile("[slug].tsx")).toEqual([{ type: "dynamic" }]);
  });

  it("maps a nested catch-all under a literal prefix", () => {
    expect(routeSegmentsForPageFile("blog/[...slug].tsx")).toEqual([
      { type: "literal", value: "blog" },
      { type: "catch-all" },
    ]);
  });

  it("maps a nested optional catch-all under a literal prefix", () => {
    expect(routeSegmentsForPageFile("blog/[[...slug]].tsx")).toEqual([
      { type: "literal", value: "blog" },
      { type: "optional-catch-all" },
    ]);
  });
});

describe("matchRoute", () => {
  const routeTable = buildRouteTable([
    { conceptId: "web-storefront/index", pagesRelative: "index.tsx" },
    { conceptId: "web-storefront/about", pagesRelative: "about.tsx" },
    { conceptId: "web-storefront/[slug]", pagesRelative: "[slug].tsx" },
  ]);

  it("matches the root route", () => {
    expect(matchRoute("/", routeTable)).toBe("web-storefront/index");
  });

  it("matches a literal route", () => {
    expect(matchRoute("/about", routeTable)).toBe("web-storefront/about");
  });

  it("matches a dynamic route with any single segment", () => {
    expect(matchRoute("/some-post", routeTable)).toBe("web-storefront/[slug]");
  });

  it("strips a query string before matching", () => {
    expect(matchRoute("/about?ref=footer", routeTable)).toBe("web-storefront/about");
  });

  it("returns undefined when no route matches (too many segments for any pattern)", () => {
    expect(matchRoute("/deeply/nested/missing", routeTable)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail because the module doesn't exist yet**

Run: `npx vitest run scripts/okf-scan/code/next-routes.test.ts`
Expected: FAIL with `Cannot find module './next-routes'` (or similar resolution error).

- [ ] **Step 3: Implement `next-routes.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run scripts/okf-scan/code/next-routes.test.ts`
Expected: PASS (16 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/code/next-routes.ts scripts/okf-scan/code/next-routes.test.ts
git commit -m "feat(okf-scan): add Next.js route parsing/matching for navigation relations"
```

---

## Task 3: `module-resolution.ts` — tsconfig-aware import resolution

**Files:**
- Create: `scripts/okf-scan/code/module-resolution.ts`
- Test: `scripts/okf-scan/code/module-resolution.test.ts`

This module has already been manually verified against the real `typescript` package
(confirmed: `parseJsonConfigFileContent` returns `paths` as written, e.g.
`{"@app/*":["./lib/*"]}`; `resolveModuleName` resolves both relative and path-aliased
specifiers to the same real file; an unresolvable specifier returns `undefined`; and
`findConfigFile` run from `scripts/okf-scan/code/__fixtures__/frontend-repo` — which has
no tsconfig.json of its own — does walk up and find this monorepo's own root
`tsconfig.json`, confirming the leak this module's guard exists to prevent is real, not
hypothetical).

- [ ] **Step 1: Write the failing tests**

`scripts/okf-scan/code/module-resolution.test.ts`:

```ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadCompilerOptions, resolveImportedFile } from "./module-resolution";

const REPO_WITH_TSCONFIG = path.join(__dirname, "__fixtures__", "repo-with-tsconfig");
const REPO_WITHOUT_TSCONFIG = path.join(__dirname, "__fixtures__", "frontend-repo");

describe("loadCompilerOptions", () => {
  it("reads baseUrl/paths from the repo's own tsconfig.json", () => {
    const options = loadCompilerOptions(REPO_WITH_TSCONFIG);
    expect(options.paths).toEqual({ "@app/*": ["./lib/*"] });
  });

  it("does not use a tsconfig.json found above repoDir (e.g. this monorepo's own root config)", () => {
    const options = loadCompilerOptions(REPO_WITHOUT_TSCONFIG);
    expect(options.paths).toBeUndefined();
  });
});

describe("resolveImportedFile", () => {
  it("resolves a relative import to a real file", () => {
    const containingFile = path.join(REPO_WITH_TSCONFIG, "lib", "consumer.ts");
    const options = loadCompilerOptions(REPO_WITH_TSCONFIG);
    const resolved = resolveImportedFile("./thing", containingFile, options);
    expect(resolved && path.resolve(resolved)).toBe(path.resolve(REPO_WITH_TSCONFIG, "lib", "thing.ts"));
  });

  it("resolves a tsconfig path-aliased import", () => {
    const containingFile = path.join(REPO_WITH_TSCONFIG, "consumer.ts");
    const options = loadCompilerOptions(REPO_WITH_TSCONFIG);
    const resolved = resolveImportedFile("@app/thing", containingFile, options);
    expect(resolved && path.resolve(resolved)).toBe(path.resolve(REPO_WITH_TSCONFIG, "lib", "thing.ts"));
  });

  it("returns undefined for an import that cannot be resolved (external/nonexistent package)", () => {
    const containingFile = path.join(REPO_WITH_TSCONFIG, "lib", "consumer.ts");
    const options = loadCompilerOptions(REPO_WITH_TSCONFIG);
    expect(resolveImportedFile("some-external-ui-lib", containingFile, options)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail because the module doesn't exist yet**

Run: `npx vitest run scripts/okf-scan/code/module-resolution.test.ts`
Expected: FAIL with `Cannot find module './module-resolution'`.

- [ ] **Step 3: Implement `module-resolution.ts`**

```ts
import path from "node:path";
import ts from "typescript";

/**
 * Reads `repoDir`'s own tsconfig.json (baseUrl/paths/moduleResolution) so
 * `resolveImportedFile` can resolve aliased imports (e.g. "@src/foo") the same way the
 * repo's own compiler would. Deliberately never returns a tsconfig found ABOVE
 * `repoDir` — `ts.findConfigFile` walks upward through parent directories, and a
 * target repo scanned from inside this monorepo (e.g.
 * `.okf-scan-cache/worktrees/<repo>-<env>/`, itself nested inside this repo) would
 * otherwise silently inherit *this* project's own tsconfig.json (and its unrelated
 * `@/*` path alias) if the target repo happened to lack one of its own — confirmed
 * to actually happen, not just a hypothetical (see this file's test for the
 * `frontend-repo` fixture, which has no tsconfig.json and sits inside this monorepo).
 */
export function loadCompilerOptions(repoDir: string): ts.CompilerOptions {
  const fallback: ts.CompilerOptions = { moduleResolution: ts.ModuleResolutionKind.NodeJs };
  const absoluteRepoDir = path.resolve(repoDir);
  const configPath = ts.findConfigFile(absoluteRepoDir, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) return fallback;

  // ts.findConfigFile only ever looks in absoluteRepoDir itself and its ancestors —
  // never subdirectories — so the only "found within this repo" case is the config
  // sitting exactly at its root.
  const isWithinRepo = path.resolve(configPath) === path.join(absoluteRepoDir, "tsconfig.json");
  if (!isWithinRepo) return fallback;

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) return fallback;
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
  return { ...fallback, ...parsed.options };
}

/**
 * Resolves an import specifier to a real file path using the repo's own compiler
 * options (so path aliases like "@src/*" work), or undefined if it can't be resolved
 * (external package, typo, etc.) — never throws.
 */
export function resolveImportedFile(
  specifier: string,
  containingFile: string,
  compilerOptions: ts.CompilerOptions
): string | undefined {
  const result = ts.resolveModuleName(specifier, containingFile, compilerOptions, ts.sys);
  return result.resolvedModule?.resolvedFileName;
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run scripts/okf-scan/code/module-resolution.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/code/module-resolution.ts scripts/okf-scan/code/module-resolution.test.ts
git commit -m "feat(okf-scan): add tsconfig-aware import resolution for composition relations"
```

---

## Task 4: Page detection in `scan-frontend-repo.ts`

Restructures `scanFrontendRepo` into two passes (discover concepts, then compute
relations) so later tasks can resolve relations against the full set of concepts in
the repo. This task only adds page detection — composition/navigation relations are
added in Tasks 5–6. The existing `fetch()`-based relation detection keeps working
unchanged.

**Files:**
- Modify: `scripts/okf-scan/code/scan-frontend-repo.ts`
- Modify: `scripts/okf-scan/code/scan-frontend-repo.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `scripts/okf-scan/code/scan-frontend-repo.test.ts` (keep the existing two `it`s
in the top-level `describe("scanFrontendRepo", ...)` block unchanged). The file already
has `import path from "node:path";` at the top and a
`const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "frontend-repo");` line right
below it — add a second `const` there, then the new `describe` block below the
existing one:

```ts
const NEXTJS_FIXTURE_DIR = path.join(__dirname, "__fixtures__", "nextjs-repo");

describe("scanFrontendRepo — page detection", () => {
  it("scans a default-exported page under src/pages/ as a Next.js Page concept", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const homePage = concepts.find((c) => c.id === "web-storefront/index");
    expect(homePage).toMatchObject({ type: "Next.js Page", level: "component" });
  });

  it("does not scan a reserved page file (_app.tsx) as a concept at all", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    expect(concepts.find((c) => c.id === "web-storefront/_app")).toBeUndefined();
  });

  it("still scans an ordinary component (not under pages/) as a React Component", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout");
    expect(layout).toMatchObject({ type: "React Component", level: "component" });
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run scripts/okf-scan/code/scan-frontend-repo.test.ts`
Expected: FAIL — `web-storefront/index` not found (pages aren't scanned yet), so the
first two new tests fail; the third fails too since `web-storefront/layout` won't exist
either (the fixture's own component, not yet scanned since `scanFrontendRepo` hasn't
been pointed at it before).

- [ ] **Step 3: Implement page detection and the two-pass restructure**

Replace the full contents of `scripts/okf-scan/code/scan-frontend-repo.ts` with:

```ts
import path from "node:path";
import ts from "typescript";
import { ROOT_CONTEXT_ID, type ConceptFacts, type FactRelation } from "../types";
import { findDescendants, listSourceFiles, parseSourceFile } from "./ts-source";
import { isReservedPageFile, pagesRelativePath } from "./next-routes";

function isExportedComponent(node: ts.Node): node is ts.FunctionDeclaration | ts.VariableStatement {
  if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text)) {
    return node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  }
  if (ts.isVariableStatement(node)) {
    const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    return isExported && node.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && /^[A-Z]/.test(d.name.text));
  }
  return false;
}

/**
 * Matches Next.js's default-export page convention: `export default function Foo() {}`,
 * or `const Foo = () => {...}; export default Foo;` (the shape actual Next.js pages use
 * — see e.g. `pages/index.tsx` in `template-marketing-webapp-nextjs` — which
 * `isExportedComponent` above deliberately does not match, since that page-specific
 * shape would also match ordinary default-exported non-component modules).
 */
function isDefaultExportedComponent(source: ts.SourceFile): boolean {
  for (const fn of findDescendants(source, ts.isFunctionDeclaration)) {
    const isDefaultExport =
      (fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false) &&
      (fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false);
    if (isDefaultExport && fn.name && /^[A-Z]/.test(fn.name.text)) return true;
  }

  const defaultExportedNames = new Set<string>();
  for (const exportAssignment of findDescendants(source, ts.isExportAssignment)) {
    if (exportAssignment.isExportEquals) continue;
    if (ts.isIdentifier(exportAssignment.expression)) defaultExportedNames.add(exportAssignment.expression.text);
  }
  if (defaultExportedNames.size === 0) return false;

  for (const varStmt of findDescendants(source, ts.isVariableStatement)) {
    for (const decl of varStmt.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && /^[A-Z]/.test(decl.name.text) && defaultExportedNames.has(decl.name.text)) {
        return true;
      }
    }
  }
  return false;
}

function findFetchUrls(root: ts.Node): string[] {
  const urls: string[] = [];
  for (const call of findDescendants(root, ts.isCallExpression)) {
    if (!ts.isIdentifier(call.expression) || call.expression.text !== "fetch") continue;
    const [arg] = call.arguments;
    if (arg && ts.isStringLiteral(arg)) urls.push(arg.text);
  }
  return urls;
}

export interface FrontendScanContext {
  repoDir: string;
  containerId: string;
  /** URL prefix -> target concept id, e.g. { "https://api.example.com/orders": "orders_api" } */
  apiBaseUrls: Record<string, string>;
}

interface ParsedFile {
  file: string;
  source: ts.SourceFile;
  conceptId: string;
  isPage: boolean;
}

export async function scanFrontendRepo(ctx: FrontendScanContext): Promise<ConceptFacts[]> {
  const files = await listSourceFiles(ctx.repoDir);

  // Pass 1: discover every concept file (page or component) before computing any
  // relations, so pass 2 can tell whether an import/link target is actually one of
  // this repo's own scanned concepts.
  const parsedFiles: ParsedFile[] = [];
  for (const file of files) {
    const source = await parseSourceFile(file);
    const pagesRelative = pagesRelativePath(file, ctx.repoDir);
    const isReservedPage = pagesRelative !== undefined && isReservedPageFile(pagesRelative);
    const isPage = pagesRelative !== undefined && !isReservedPage && isDefaultExportedComponent(source);
    const isComponent = !isPage && findDescendants(source, isExportedComponent).length > 0;
    if (!isPage && !isComponent) continue;

    parsedFiles.push({
      file,
      source,
      conceptId: `${ctx.containerId}/${path.basename(file, path.extname(file))}`,
      isPage,
    });
  }

  // Unlike a Lambda repo (whose container concept comes from the matching Terraform
  // resource, see scan-terraform.ts), a frontend repo has no backing AWS resource to
  // synthesize this from — without it, the components below would all declare a
  // parentId that no concept ever defines, leaving them unreachable from the bundle's
  // index.md link graph (okf-import.ts only discovers concepts by walking index.md
  // links, never by listing a directory directly).
  const concepts: ConceptFacts[] = [
    { id: ctx.containerId, type: "Frontend Application", level: "container", parentId: ROOT_CONTEXT_ID, sourceFiles: [ctx.repoDir] },
  ];

  for (const parsed of parsedFiles) {
    const relations: FactRelation[] = [];
    const needsReview: string[] = [];

    for (const url of findFetchUrls(parsed.source)) {
      const baseUrl = Object.keys(ctx.apiBaseUrls).find((prefix) => url.startsWith(prefix));
      if (!baseUrl) {
        needsReview.push(`fetch("${url}") does not match any known API base URL`);
        continue;
      }
      relations.push({
        targetId: ctx.apiBaseUrls[baseUrl],
        kind: "sync",
        evidence: `fetch("${url}") matches configured API base URL "${baseUrl}"`,
      });
    }

    concepts.push({
      id: parsed.conceptId,
      type: parsed.isPage ? "Next.js Page" : "React Component",
      level: "component",
      parentId: ctx.containerId,
      relations,
      sourceFiles: [parsed.file],
      needsReview: needsReview.length > 0 ? needsReview : undefined,
    });
  }

  return concepts;
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run scripts/okf-scan/code/scan-frontend-repo.test.ts`
Expected: PASS (5 tests: the original 2 + the new 3).

- [ ] **Step 5: Run the full okf-scan suite to check nothing else broke**

Run: `npx vitest run scripts/okf-scan`
Expected: PASS, except the pre-existing unrelated `llm.test.ts` failure ("throws
immediately when no API key is available") if `ANTHROPIC_API_KEY` happens to be set in
the shell environment — that failure predates this plan and isn't caused by it.

- [ ] **Step 6: Commit**

```bash
git add scripts/okf-scan/code/scan-frontend-repo.ts scripts/okf-scan/code/scan-frontend-repo.test.ts
git commit -m "feat(okf-scan): scan Next.js pages as Next.js Page concepts"
```

---

## Task 5: Composition relations in `scan-frontend-repo.ts`

**Files:**
- Modify: `scripts/okf-scan/code/scan-frontend-repo.ts`
- Modify: `scripts/okf-scan/code/scan-frontend-repo.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `scripts/okf-scan/code/scan-frontend-repo.test.ts`:

```ts
describe("scanFrontendRepo — composition relations", () => {
  it("creates a relation for a relative import of another scanned component", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.relations).toContainEqual(
      expect.objectContaining({ targetId: "web-storefront/header", kind: "sync" }),
    );
  });

  it("creates a relation for a tsconfig path-aliased import of another scanned component", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const homePage = concepts.find((c) => c.id === "web-storefront/index")!;
    expect(homePage.relations).toContainEqual(
      expect.objectContaining({ targetId: "web-storefront/layout", kind: "sync" }),
    );
  });

  it("does not create a relation for a type-only import, even of a real scanned component", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.relations?.some((r) => r.targetId === "web-storefront/footer")).toBe(false);
  });

  it("does not create a relation or a needsReview note for an import that resolves but isn't a scanned concept", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.relations?.some((r) => r.evidence.includes("helpers"))).toBe(false);
    expect(layout.needsReview?.some((n) => n.includes("helpers"))).toBeFalsy();
  });

  it("does not create a relation or a needsReview note for an import that can't be resolved at all (external package)", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.relations?.some((r) => r.evidence.includes("SomeWidget"))).toBe(false);
    expect(layout.needsReview?.some((n) => n.includes("some-external-ui-lib"))).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run scripts/okf-scan/code/scan-frontend-repo.test.ts`
Expected: FAIL — the first two tests fail because no composition relations exist yet
(`layout.relations` / `homePage.relations` are empty arrays); the other three currently
pass vacuously (nothing creates any relation yet at all) but are written now so they
keep proving the negative once composition detection exists.

- [ ] **Step 3: Implement composition relation detection**

In `scripts/okf-scan/code/scan-frontend-repo.ts`, add the import:

```ts
import { loadCompilerOptions, resolveImportedFile } from "./module-resolution";
```

Add this function (near `findFetchUrls`):

```ts
function importedNameFor(importClause: ts.ImportClause | undefined, specifier: string): string {
  if (!importClause) return specifier;
  if (importClause.name) return importClause.name.text;
  if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
    return importClause.namedBindings.elements.map((e) => e.name.text).join(", ");
  }
  if (importClause.namedBindings && ts.isNamespaceImport(importClause.namedBindings)) {
    return importClause.namedBindings.name.text;
  }
  return specifier;
}

/** Static import → "composition" relation: does file A import a component/page that's also a scanned concept in this same repo? Type-only imports and imports that don't resolve to another scanned concept (external packages, non-component files) are silently skipped — see the design doc's "Composition relations" section. */
function findCompositionRelations(
  source: ts.SourceFile,
  containingFile: string,
  compilerOptions: ts.CompilerOptions,
  fileToConceptId: Map<string, string>
): FactRelation[] {
  const relations: FactRelation[] = [];
  for (const imp of findDescendants(source, ts.isImportDeclaration)) {
    if (imp.importClause?.isTypeOnly) continue;
    if (!ts.isStringLiteral(imp.moduleSpecifier)) continue;
    const specifier = imp.moduleSpecifier.text;
    const resolved = resolveImportedFile(specifier, containingFile, compilerOptions);
    if (!resolved) continue;
    const targetId = fileToConceptId.get(path.resolve(resolved));
    if (!targetId) continue;
    relations.push({
      targetId,
      kind: "sync",
      evidence: `imports ${importedNameFor(imp.importClause, specifier)} from "${specifier}"`,
    });
  }
  return relations;
}
```

Now wire it into `scanFrontendRepo`. Add, right after the `parsedFiles` loop (pass 1),
a `fileToConceptId` map and the `compilerOptions` load:

```ts
  const compilerOptions = loadCompilerOptions(ctx.repoDir);
  const fileToConceptId = new Map<string, string>(
    parsedFiles.map((p) => [path.resolve(p.file), p.conceptId]),
  );
```

(insert this block right before the `const concepts: ConceptFacts[] = [...]` line).

Then, inside the pass-2 `for (const parsed of parsedFiles)` loop, right after the
existing `findFetchUrls` block, add:

```ts
    relations.push(...findCompositionRelations(parsed.source, parsed.file, compilerOptions, fileToConceptId));
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run scripts/okf-scan/code/scan-frontend-repo.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/code/scan-frontend-repo.ts scripts/okf-scan/code/scan-frontend-repo.test.ts
git commit -m "feat(okf-scan): detect component composition relations via static imports"
```

---

## Task 6: Navigation relations in `scan-frontend-repo.ts`

**Files:**
- Modify: `scripts/okf-scan/code/scan-frontend-repo.ts`
- Modify: `scripts/okf-scan/code/scan-frontend-repo.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `scripts/okf-scan/code/scan-frontend-repo.test.ts`:

```ts
describe("scanFrontendRepo — navigation relations", () => {
  it("creates a relation for a <Link href> matching a static page route", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.relations).toContainEqual(
      expect.objectContaining({ targetId: "web-storefront/about", kind: "sync" }),
    );
  });

  it("creates a relation for a router.push(...) literal matching a dynamic page route", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.relations).toContainEqual(
      expect.objectContaining({ targetId: "web-storefront/[slug]", kind: "sync" }),
    );
  });

  it("adds a needsReview note for a <Link href> that matches no known page route", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.needsReview).toContainEqual(
      expect.stringContaining("/deeply/nested/missing"),
    );
  });

  it("adds a needsReview note for a router.push(...) with an interpolated (non-literal) target", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.needsReview).toContainEqual(
      expect.stringContaining("non-literal"),
    );
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run scripts/okf-scan/code/scan-frontend-repo.test.ts`
Expected: FAIL — no navigation relations or needsReview notes exist yet.

- [ ] **Step 3: Implement navigation relation detection**

In `scripts/okf-scan/code/scan-frontend-repo.ts`, Task 4 already added
`import { isReservedPageFile, pagesRelativePath } from "./next-routes";` — extend that
same line instead of adding a second import from the same module:

```ts
import { buildRouteTable, isReservedPageFile, matchRoute, pagesRelativePath } from "./next-routes";
```

Add these two functions (near `findFetchUrls`):

```ts
function extractStringLiteral(node: ts.Node | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isJsxExpression(node) && node.expression) return extractStringLiteral(node.expression);
  return null;
}

interface NavigationTarget {
  /** The literal path, or null when a Link/router.push was found but its target isn't a static string (e.g. a template literal with interpolation). */
  literal: string | null;
  description: string;
}

/** Finds `<Link href="...">` and `router.push("...")`/`Router.push("...")` call sites. Matches purely on tag/identifier name, not import provenance — see the design doc's "Navigation relations" section for why that's an acceptable simplification. */
function findNavigationTargets(root: ts.Node): NavigationTarget[] {
  const targets: NavigationTarget[] = [];

  for (const jsx of findDescendants(
    root,
    (n): n is ts.JsxOpeningElement | ts.JsxSelfClosingElement => ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n),
  )) {
    if (!ts.isIdentifier(jsx.tagName) || jsx.tagName.text !== "Link") continue;
    const hrefAttr = jsx.attributes.properties.find(
      (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === "href",
    );
    if (!hrefAttr) continue;
    const literal = extractStringLiteral(hrefAttr.initializer);
    targets.push({
      literal,
      description: literal ? `<Link href="${literal}">` : `<Link href={...}> with a non-literal value`,
    });
  }

  for (const call of findDescendants(root, ts.isCallExpression)) {
    if (!ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== "push") continue;
    if (!ts.isIdentifier(call.expression.expression)) continue;
    if (!["router", "Router"].includes(call.expression.expression.text)) continue;
    const [arg] = call.arguments;
    const literal = extractStringLiteral(arg);
    targets.push({
      literal,
      description: literal ? `router.push("${literal}")` : "router.push(...) with a non-literal value",
    });
  }

  return targets;
}
```

Now wire it in. Right after the `parsedFiles` loop (pass 1), where `compilerOptions`
and `fileToConceptId` are computed (from Task 5), add the route table:

```ts
  const routeTable = buildRouteTable(
    parsedFiles
      .filter((p) => p.isPage)
      .map((p) => ({ conceptId: p.conceptId, pagesRelative: pagesRelativePath(p.file, ctx.repoDir)! })),
  );
```

Then, inside the pass-2 loop, right after the `findCompositionRelations` line added in
Task 5, add:

```ts
    for (const nav of findNavigationTargets(parsed.source)) {
      if (nav.literal === null) {
        needsReview.push(`${nav.description} does not resolve to a static path`);
        continue;
      }
      const targetId = matchRoute(nav.literal, routeTable);
      if (!targetId) {
        needsReview.push(`${nav.description} does not match any known page route`);
        continue;
      }
      relations.push({ targetId, kind: "sync", evidence: `${nav.description} resolves to page "${targetId}"` });
    }
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run scripts/okf-scan/code/scan-frontend-repo.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 5: Run the full okf-scan suite**

Run: `npx vitest run scripts/okf-scan`
Expected: PASS, except the same pre-existing, unrelated `llm.test.ts` API-key test
mentioned in Task 4.

- [ ] **Step 6: Commit**

```bash
git add scripts/okf-scan/code/scan-frontend-repo.ts scripts/okf-scan/code/scan-frontend-repo.test.ts
git commit -m "feat(okf-scan): detect page-to-page navigation relations via Link/router.push"
```

---

## Task 7: LLM relation-label enrichment

Changes `LlmClient.describeConcept`'s return type from a plain `string` to
`{ prose, relationLabels }`, updates the prompt to ask for per-relation labels when
relations exist, and wires the result into `synthesize.ts` so `# Relations` sections
use the friendlier label while the manifest still stores the original, label-free
facts (so hash-based skip-if-unchanged behavior on future runs is unaffected).

**Files:**
- Modify: `scripts/okf-scan/synthesize/llm.ts`
- Modify: `scripts/okf-scan/synthesize/llm.test.ts`
- Modify: `scripts/okf-scan/synthesize/synthesize.ts`
- Modify: `scripts/okf-scan/synthesize/synthesize.test.ts`

- [ ] **Step 1: Update the two existing `llm.test.ts` assertions that read the old plain-string return value**

In `scripts/okf-scan/synthesize/llm.test.ts`, change:

```ts
  it("returns the trimmed text content from a successful call", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "  A DynamoDB table.  " }],
      stop_reason: "end_turn",
    });

    const client = createAnthropicLlmClient("fake-key");
    const prose = await client.describeConcept(facts);

    expect(prose).toBe("A DynamoDB table.");
  });
```

to:

```ts
  it("returns the trimmed text content from a successful call", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "  A DynamoDB table.  " }],
      stop_reason: "end_turn",
    });

    const client = createAnthropicLlmClient("fake-key");
    const description = await client.describeConcept(facts);

    expect(description.prose).toBe("A DynamoDB table.");
    expect(description.relationLabels).toEqual([]);
  });
```

and change:

```ts
  it("retries once on a 429 rate-limit error and then succeeds", async () => {
    vi.useFakeTimers();
    createMock.mockReset();
    createMock
      .mockRejectedValueOnce(new AnthropicModule.APIError(429, "rate limited"))
      .mockResolvedValueOnce({ content: [{ type: "text", text: "Recovered." }], stop_reason: "end_turn" });

    const client = createAnthropicLlmClient("fake-key");
    const prosePromise = client.describeConcept(facts);

    await vi.advanceTimersByTimeAsync(500);
    const prose = await prosePromise;

    expect(prose).toBe("Recovered.");
    expect(createMock).toHaveBeenCalledTimes(2);
  });
```

to:

```ts
  it("retries once on a 429 rate-limit error and then succeeds", async () => {
    vi.useFakeTimers();
    createMock.mockReset();
    createMock
      .mockRejectedValueOnce(new AnthropicModule.APIError(429, "rate limited"))
      .mockResolvedValueOnce({ content: [{ type: "text", text: "Recovered." }], stop_reason: "end_turn" });

    const client = createAnthropicLlmClient("fake-key");
    const descriptionPromise = client.describeConcept(facts);

    await vi.advanceTimersByTimeAsync(500);
    const description = await descriptionPromise;

    expect(description.prose).toBe("Recovered.");
    expect(createMock).toHaveBeenCalledTimes(2);
  });
```

- [ ] **Step 2: Add the new relation-label parsing tests**

Add to the end of the `describe("createAnthropicLlmClient", ...)` block in
`scripts/okf-scan/synthesize/llm.test.ts` (before the final closing `});`):

```ts
  it("splits prose from a well-formed numbered relation-labels list, matching them in order", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: [
            "Layout composes the page shell.",
            "",
            "RELATION LABELS:",
            "1. Renders the site header for navigation",
            "2. Renders the site footer",
          ].join("\n"),
        },
      ],
      stop_reason: "end_turn",
    });

    const factsWithRelations: ConceptFacts = {
      id: "web-storefront/layout",
      type: "React Component",
      level: "component",
      parentId: "web-storefront",
      sourceFiles: [],
      relations: [
        { targetId: "web-storefront/header", kind: "sync", evidence: 'imports Header from "./header"' },
        { targetId: "web-storefront/ctf-footer-gql", kind: "sync", evidence: 'imports CtfFooterGql from "@src/ctf-footer-gql"' },
      ],
    };

    const client = createAnthropicLlmClient("fake-key");
    const description = await client.describeConcept(factsWithRelations);

    expect(description.prose).toBe("Layout composes the page shell.");
    expect(description.relationLabels).toEqual([
      "Renders the site header for navigation",
      "Renders the site footer",
    ]);
  });

  it("falls back to an empty relation-labels list when the count doesn't match, without throwing", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: ["Layout composes the page shell.", "", "RELATION LABELS:", "1. Renders the site header"].join("\n"),
        },
      ],
      stop_reason: "end_turn",
    });

    const factsWithRelations: ConceptFacts = {
      id: "web-storefront/layout",
      type: "React Component",
      level: "component",
      parentId: "web-storefront",
      sourceFiles: [],
      relations: [
        { targetId: "web-storefront/header", kind: "sync", evidence: "imports Header" },
        { targetId: "web-storefront/ctf-footer-gql", kind: "sync", evidence: "imports CtfFooterGql" },
      ],
    };

    const client = createAnthropicLlmClient("fake-key");
    const description = await client.describeConcept(factsWithRelations);

    expect(description.prose).toBe("Layout composes the page shell.");
    expect(description.relationLabels).toEqual([]);
  });

  it("falls back to an empty relation-labels list when the RELATION LABELS marker is missing", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "Layout composes the page shell." }],
      stop_reason: "end_turn",
    });

    const factsWithRelations: ConceptFacts = {
      id: "web-storefront/layout",
      type: "React Component",
      level: "component",
      parentId: "web-storefront",
      sourceFiles: [],
      relations: [{ targetId: "web-storefront/header", kind: "sync", evidence: "imports Header" }],
    };

    const client = createAnthropicLlmClient("fake-key");
    const description = await client.describeConcept(factsWithRelations);

    expect(description.prose).toBe("Layout composes the page shell.");
    expect(description.relationLabels).toEqual([]);
  });

  it("does not request relation labels in the prompt when facts have no relations", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" });

    const client = createAnthropicLlmClient("fake-key");
    await client.describeConcept(facts);

    const sentPrompt = createMock.mock.calls[0][0].messages[0].content as string;
    expect(sentPrompt).not.toContain("RELATION LABELS");
  });
```

- [ ] **Step 3: Run the tests and verify they fail for the expected reason**

Run: `npx vitest run scripts/okf-scan/synthesize/llm.test.ts`
Expected: FAIL — `description.prose`/`description.relationLabels` are `undefined`
(current `describeConcept` still returns a plain string), and the new tests fail
because there's no relation-label parsing at all yet.

- [ ] **Step 4: Implement the `ConceptDescription` return type and relation-label parsing**

In `scripts/okf-scan/synthesize/llm.ts`, replace the `buildPrompt` function with:

```ts
function buildPrompt(facts: ConceptFacts): string {
  const requiredLines = [
    "You are writing one OKF concept document body for an architecture diagram tool.",
    `Concept id: ${facts.id}`,
    `Type: ${facts.type}`,
  ];

  const optionalLines = [
    facts.awsResourceType ? `AWS resource type: ${facts.awsResourceType}` : "",
    facts.schema ? `Schema:\n${JSON.stringify(facts.schema, null, 2)}` : "",
    facts.relations?.length
      ? `Known relations (already extracted — do not invent any others):\n${facts.relations
          .map((r) => `- ${r.targetId}: ${r.evidence}`)
          .join("\n")}`
      : "",
  ].filter(Boolean);

  const relationCount = facts.relations?.length ?? 0;
  const instructionLines = [
    "Write 1-3 short paragraphs of plain prose describing what this concept is and how it's used, grounded only in the facts above. Do not invent fields, relations, or capabilities not listed. Do not include a heading or any markdown section markers — just the prose paragraphs.",
  ];
  if (relationCount > 0) {
    instructionLines.push(
      "",
      `After the prose, add a line containing only "RELATION LABELS:", then a numbered list with exactly ${relationCount} entries — one per relation listed above, in the same order — each a short, user-flow-oriented phrase describing that relation (e.g. "Renders the site footer" rather than restating the evidence verbatim). Do not add any other text after the list.`,
    );
  }

  // requiredLines/optionalLines are joined first, then the blank separator and final
  // instruction are appended — this keeps the blank line intact regardless of which
  // optional fact lines are present (see Issue 1 in the code review).
  return [...requiredLines, ...optionalLines, "", ...instructionLines].join("\n");
}
```

Add this new interface and parsing function right after `buildPrompt`:

```ts
export interface ConceptDescription {
  prose: string;
  /**
   * Parallel to facts.relations; relationLabels[i] describes facts.relations[i].
   * Empty when there was nothing to enrich, or when the response couldn't be parsed
   * as expected — callers should fall back to each relation's raw evidence in that
   * case (a soft degrade, not a hard failure; see the design doc's "LLM label
   * enrichment" section).
   */
  relationLabels: string[];
}

const RELATION_LABELS_MARKER = "RELATION LABELS:";

function parseDescription(text: string, relationCount: number): ConceptDescription {
  const markerIndex = text.indexOf(RELATION_LABELS_MARKER);
  if (relationCount === 0 || markerIndex === -1) {
    return { prose: (markerIndex === -1 ? text : text.slice(0, markerIndex)).trim(), relationLabels: [] };
  }

  const prose = text.slice(0, markerIndex).trim();
  const labelsText = text.slice(markerIndex + RELATION_LABELS_MARKER.length);
  const labels = labelsText
    .split("\n")
    .map((line) => line.match(/^\s*\d+[.)]\s*(.+)$/)?.[1]?.trim())
    .filter((label): label is string => Boolean(label));

  return { prose, relationLabels: labels.length === relationCount ? labels : [] };
}
```

Change the `LlmClient` interface:

```ts
export interface LlmClient {
  describeConcept(facts: ConceptFacts): Promise<ConceptDescription>;
}
```

In `createAnthropicLlmClient`, change the `describeConcept` method's return statement
from:

```ts
          const textBlock = response.content.find((block) => block.type === "text");
          if (!textBlock || textBlock.type !== "text") throw new Error("LLM response had no text content");
          return textBlock.text.trim();
```

to:

```ts
          const textBlock = response.content.find((block) => block.type === "text");
          if (!textBlock || textBlock.type !== "text") throw new Error("LLM response had no text content");
          return parseDescription(textBlock.text.trim(), facts.relations?.length ?? 0);
```

Also update the method's own signature from
`async describeConcept(facts: ConceptFacts): Promise<string> {` to
`async describeConcept(facts: ConceptFacts): Promise<ConceptDescription> {`.

- [ ] **Step 5: Run the `llm.test.ts` tests and verify they pass**

Run: `npx vitest run scripts/okf-scan/synthesize/llm.test.ts`
Expected: PASS (15 tests), except the same pre-existing, unrelated "throws immediately
when no API key is available" failure if `ANTHROPIC_API_KEY` is set in the shell.

- [ ] **Step 6: Update `synthesize.test.ts`'s `fakeLlm()` helper and its one inline custom client**

In `scripts/okf-scan/synthesize/synthesize.test.ts`, change:

```ts
function fakeLlm(): { client: LlmClient; calls: ConceptFacts[] } {
  const calls: ConceptFacts[] = [];
  return {
    calls,
    client: {
      async describeConcept(facts) {
        calls.push(facts);
        return `Prose for ${facts.id}.`;
      },
    },
  };
}
```

to:

```ts
function fakeLlm(): { client: LlmClient; calls: ConceptFacts[] } {
  const calls: ConceptFacts[] = [];
  return {
    calls,
    client: {
      async describeConcept(facts) {
        calls.push(facts);
        return { prose: `Prose for ${facts.id}.`, relationLabels: [] };
      },
    },
  };
}
```

And, in the `"isolates one concept's LLM failure..."` test, change:

```ts
    const client: LlmClient = {
      async describeConcept(facts) {
        calls.push(facts.id);
        if (facts.id === "orders_table") throw new Error("rate limited");
        return `Prose for ${facts.id}.`;
      },
    };
```

to:

```ts
    const client: LlmClient = {
      async describeConcept(facts) {
        calls.push(facts.id);
        if (facts.id === "orders_table") throw new Error("rate limited");
        return { prose: `Prose for ${facts.id}.`, relationLabels: [] };
      },
    };
```

- [ ] **Step 7: Add the new synthesize-level relation-label test**

Add to `scripts/okf-scan/synthesize/synthesize.test.ts` (a new `it` inside the
`describe("synthesize", ...)` block):

```ts
  it("uses the LLM-provided relation label in the Relations section instead of the raw evidence", async () => {
    const scanResult: ScanResult = {
      groups: [],
      lambdaEnvVarBindings: {},
      concepts: [
        {
          id: "orders",
          type: "AWS Lambda Function",
          level: "container",
          parentId: "platform",
          relations: [{ targetId: "orders_table", kind: "sync", evidence: "PutItemCommand" }],
          sourceFiles: [],
        },
        { id: "orders_table", type: "Amazon DynamoDB Table", level: "container", parentId: "platform", sourceFiles: [] },
      ],
    };
    const client: LlmClient = {
      async describeConcept(facts) {
        return {
          prose: `Prose for ${facts.id}.`,
          relationLabels: facts.relations?.map(() => "Writes new orders to the table") ?? [],
        };
      },
    };

    await synthesize({ scanResult, bundleDir, llm: client });

    const ordersContent = await readFile(path.join(bundleDir, "orders.md"), "utf-8");
    expect(ordersContent).toContain("[Orders Table](orders_table.md) — Writes new orders to the table {kind: sync}");
    expect(ordersContent).not.toContain("PutItemCommand");
  });
```

- [ ] **Step 8: Run `synthesize.test.ts` and verify the new test fails, the rest still pass**

Run: `npx vitest run scripts/okf-scan/synthesize/synthesize.test.ts`
Expected: the new test FAILs (synthesize.ts still passes raw `evidence` through, and
currently doesn't even compile against the new `LlmClient` shape — the file also won't
build correctly yet since `synthesize.ts` still treats `llm.describeConcept`'s result
as a plain string). All other tests in this file should otherwise still reflect the
same behavior as before once `fakeLlm()` is updated (Step 6 already handles that).

- [ ] **Step 9: Wire relation labels into `synthesize.ts`**

In `scripts/okf-scan/synthesize/synthesize.ts`, inside the `mapWithConcurrency`
callback (the `async ({ facts, inputHash }) => { ... }` function), change:

```ts
      try {
        const filePath = conceptFilePath(bundleDir, facts.id);
        const preserved = readPreserved(await readIfExists(filePath));
        const prose = await llm.describeConcept(facts);
        const markdown = buildConceptMarkdown({ facts, prose, preserved, conceptTitles, groups: scanResult.groups });
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, markdown, "utf-8");
        return { status: "ok", id: facts.id, inputHash, facts };
      } catch (err) {
        return { status: "error", id: facts.id, error: err instanceof Error ? err.message : String(err) };
      }
```

to:

```ts
      try {
        const filePath = conceptFilePath(bundleDir, facts.id);
        const preserved = readPreserved(await readIfExists(filePath));
        const description = await llm.describeConcept(facts);
        // factsForMarkdown is a scratch copy carrying the LLM's relation labels,
        // used only for this concept's markdown output — the manifest still stores
        // the original, label-free `facts` below (unchanged), so a future run's
        // inputHash comparison keeps comparing like-for-like against freshly-scanned
        // facts, which never carry a `label` (only scanners produce facts, and no
        // scanner ever sets `.label`, only `.evidence`).
        const factsForMarkdown: ConceptFacts = facts.relations
          ? {
              ...facts,
              relations: facts.relations.map((rel, i) => ({ ...rel, label: description.relationLabels[i] ?? rel.label })),
            }
          : facts;
        const markdown = buildConceptMarkdown({
          facts: factsForMarkdown,
          prose: description.prose,
          preserved,
          conceptTitles,
          groups: scanResult.groups,
        });
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, markdown, "utf-8");
        return { status: "ok", id: facts.id, inputHash, facts };
      } catch (err) {
        return { status: "error", id: facts.id, error: err instanceof Error ? err.message : String(err) };
      }
```

- [ ] **Step 10: Run the full okf-scan suite and verify everything passes**

Run: `npx vitest run scripts/okf-scan`
Expected: PASS, except the same pre-existing, unrelated `llm.test.ts` API-key test.

- [ ] **Step 11: Commit**

```bash
git add scripts/okf-scan/synthesize/llm.ts scripts/okf-scan/synthesize/llm.test.ts scripts/okf-scan/synthesize/synthesize.ts scripts/okf-scan/synthesize/synthesize.test.ts
git commit -m "feat(okf-scan): enrich relation labels via LLM, falling back to raw evidence"
```

---

## Task 8: Regenerate the `blog` bundle and verify end-to-end

**Files:**
- Modify: `public/okf-bundles/blog/.scan-manifest.json` (via the CLI, not by hand)
- Modify: `public/okf-bundles/blog/**/*.md` (regenerated output)

- [ ] **Step 1: Reset only the frontend repo's freshness entry, so it gets rescanned but unrelated unchanged concepts are still skipped**

```bash
node -e '
const fs = require("fs");
const p = "public/okf-bundles/blog/.scan-manifest.json";
const m = JSON.parse(fs.readFileSync(p, "utf-8"));
delete m._repos["template-marketing-webapp-nextjs"];
fs.writeFileSync(p, JSON.stringify(m, null, 2) + "\n");
'
```

- [ ] **Step 2: Run the scan**

```bash
npx tsx scripts/okf-scan/index.ts --repo-map repo-map.yaml --env prd --out public/okf-bundles/blog
```

Expected output: `okf-scan: wrote N, skipped M concept(s) into public/okf-bundles/blog`
— `N` should be small (only concepts whose facts actually changed: the new page
concepts, and any component that gained new composition/navigation relations), not all
74.

- [ ] **Step 3: Validate the regenerated bundle**

```bash
npm run validate
```

Expected: `validate-model: all architecture models are valid.` (all 5 data sources,
including `blog`).

- [ ] **Step 4: Confirm relations are actually present**

```bash
node -e '
const fs = require("fs");
const m = JSON.parse(fs.readFileSync("public/okf-bundles/blog/.scan-manifest.json", "utf-8"));
const entries = Object.values(m.concepts);
const withRel = entries.filter(e => (e.facts.relations||[]).length > 0);
console.log("total concepts:", entries.length);
console.log("concepts with relations:", withRel.length);
'
```

Expected: `concepts with relations:` is greater than 0 (previously 0 for all 74).

- [ ] **Step 5: Commit the regenerated bundle**

```bash
git add public/okf-bundles/blog
git commit -m "chore(okf-scan): regenerate blog bundle with page/composition/navigation relations"
```
