# OKF Scan — Route Hierarchy & Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make generated OKF bundles read like the hand-authored `webapp` exemplar: routes as drillable containers under a frontend system, merged `-gql`/`.generated` file triplets, flow-oriented relations, a capped organizer, and route-anchored prose.

**Architecture:** Two new pure transforms run at the end of `scanFrontendRepo` — `mergeGeneratedSatellites` (folds `X-gql`/`X.generated` concepts into `X`) then `buildRouteHierarchy` (promotes the app to `level: context`, pages to `level: container`, re-parents each component under the single page that reaches it via static imports, or under a synthetic `shared-ui` container). Synthesize/LLM changes are independent: the organizer prompt gets a group cap and small containers skip organizing; the prose prompt gains route anchoring and an anti-boilerplate rule; `buildConceptMarkdown` stops duplicating the first paragraph as both description and body.

**Tech Stack:** TypeScript, Vitest, Node `fs/promises`, TypeScript compiler API (existing), Anthropic SDK (existing). No new dependencies.

**Key constraint discovered up front:** `src/lib/validate-model.ts:101` enforces strict C4 nesting (child level must be exactly one below the parent: context → container → component). So "routes as drillable nodes" **requires** promoting the frontend app concept to `level: context, parentId: null` (exactly what the hand-authored `public/okf-bundles/webapp/webapp-system.md` does) and pages to `level: container`. Components stay `level: component` under a page or under `shared-ui`.

**Why relation noise mostly disappears for free:** once components live under route containers, the existing `getRelationsForViewWithRollup` aggregates all cross-container component edges into single "N interações" edges between route containers at the drilled-into-app view — the same look the `webapp` bundle achieves manually. The only scan-level relation work needed is merge-aware dedupe and self-loop removal (Task 1).

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `scripts/okf-scan/code/merge-generated.ts` | Create | Pure transform: fold `-gql`/`.generated` satellite concepts into their base concept |
| `scripts/okf-scan/code/merge-generated.test.ts` | Create | Unit tests for the merge |
| `scripts/okf-scan/code/route-hierarchy.ts` | Create | Pure transform: app→context, pages→containers, components re-parented by import reachability |
| `scripts/okf-scan/code/route-hierarchy.test.ts` | Create | Unit tests for the hierarchy |
| `scripts/okf-scan/types.ts` | Modify | Add `routePath?` / `usedByRoutes?` to `ConceptFacts` |
| `scripts/okf-scan/code/scan-frontend-repo.ts` | Modify | Set `routePath` on pages; pipe output through both transforms |
| `scripts/okf-scan/code/scan-frontend-repo.test.ts` | Modify | Update expectations to the new shape; add merge fixture test |
| `scripts/okf-scan/code/__fixtures__/nextjs-repo/src/components/widget*.tsx` | Create (3 files) | Fixture for satellite merge |
| `scripts/okf-scan/synthesize/organize.ts` | Modify | Prompt: cap at 8 groups, fold groups smaller than 3 |
| `scripts/okf-scan/synthesize/synthesize.ts` | Modify | Skip organizer for containers with ≤ 8 children; root files list `parentId === null` concepts; frontend-only bundles get `boundary: false` and no `platform.md` |
| `scripts/okf-scan/synthesize/synthesize.test.ts` | Modify | Tests for organizer skip + root-file changes |
| `scripts/okf-scan/synthesize/llm.ts` | Modify | Export `buildPrompt`; route-anchored, anti-boilerplate prose prompt |
| `scripts/okf-scan/synthesize/llm.test.ts` | Modify | Prompt-content tests |
| `scripts/okf-scan/synthesize/markdown.ts` | Modify | Body prose no longer repeats the description paragraph |
| `scripts/okf-scan/synthesize/markdown.test.ts` | Modify | Dedupe tests |
| `scripts/okf-scan/e2e.test.ts` | Modify | Add frontend-shaped end-to-end test |
| `scripts/okf-scan/index.ts` | Modify | Frontend manifest-cache filter matches nested ids |

Execution order matters only where noted; Tasks 4, 5, 6 are independent of 1–3.

---

### Task 1: `mergeGeneratedSatellites` — fold `-gql` / `.generated` concepts into their base

The blog repo emits `ctf-quote`, `ctf-quote-gql`, and `ctf-quote.generated` as three separate concepts. They are one logical component. Merge rule (deterministic, no LLM): a concept whose id leaf, after repeatedly stripping a trailing `.generated` or `-gql`, matches a **sibling** concept's leaf is a *satellite* of that sibling (the *primary*). Satellites disappear; the primary absorbs their `sourceFiles`, `relations` (re-pointed, deduped by target, self-loops dropped) and `needsReview`. Relations *from other concepts* to a satellite are re-pointed at the primary. A satellite with no existing primary (e.g. `post-link.generated` with no `post-link`) stays standalone.

**Files:**
- Create: `scripts/okf-scan/code/merge-generated.ts`
- Test: `scripts/okf-scan/code/merge-generated.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// scripts/okf-scan/code/merge-generated.test.ts
import { describe, expect, it } from "vitest";
import { mergeGeneratedSatellites, satelliteBaseKey } from "./merge-generated";
import type { ConceptFacts } from "../types";

function concept(id: string, overrides: Partial<ConceptFacts> = {}): ConceptFacts {
  return { id, type: "React Component", level: "component", parentId: "app", sourceFiles: [`${id}.tsx`], ...overrides };
}

describe("satelliteBaseKey", () => {
  it("strips -gql, .generated, and stacked suffixes; leaves plain leaves alone", () => {
    expect(satelliteBaseKey("ctf-quote-gql")).toBe("ctf-quote");
    expect(satelliteBaseKey("ctf-quote.generated")).toBe("ctf-quote");
    expect(satelliteBaseKey("ctf-quote-gql.generated")).toBe("ctf-quote");
    expect(satelliteBaseKey("ctf-quote")).toBe("ctf-quote");
  });
});

describe("mergeGeneratedSatellites", () => {
  it("folds satellites into the primary: union of sourceFiles, satellites removed", () => {
    const merged = mergeGeneratedSatellites([
      concept("app/ctf-quote"),
      concept("app/ctf-quote-gql"),
      concept("app/ctf-quote.generated"),
    ]);
    expect(merged.map((c) => c.id)).toEqual(["app/ctf-quote"]);
    expect(merged[0].sourceFiles.sort()).toEqual([
      "app/ctf-quote-gql.tsx",
      "app/ctf-quote.generated.tsx",
      "app/ctf-quote.tsx",
    ]);
  });

  it("re-points other concepts' relations at the primary and dedupes by target", () => {
    const merged = mergeGeneratedSatellites([
      concept("app/page", {
        relations: [
          { targetId: "app/ctf-quote", evidence: "imports CtfQuote" },
          { targetId: "app/ctf-quote-gql", evidence: "imports CtfQuoteQuery" },
        ],
      }),
      concept("app/ctf-quote"),
      concept("app/ctf-quote-gql"),
    ]);
    const page = merged.find((c) => c.id === "app/page")!;
    expect(page.relations).toHaveLength(1);
    expect(page.relations![0].targetId).toBe("app/ctf-quote");
  });

  it("drops intra-group relations (they become self-loops after the merge)", () => {
    const merged = mergeGeneratedSatellites([
      concept("app/ctf-quote", { relations: [{ targetId: "app/ctf-quote-gql", evidence: "imports query" }] }),
      concept("app/ctf-quote-gql", { relations: [{ targetId: "app/ctf-quote.generated", evidence: "imports fragment" }] }),
      concept("app/ctf-quote.generated"),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].relations ?? []).toHaveLength(0);
  });

  it("keeps a satellite standalone when no primary concept exists", () => {
    const merged = mergeGeneratedSatellites([concept("app/post-link.generated")]);
    expect(merged.map((c) => c.id)).toEqual(["app/post-link.generated"]);
  });

  it("keeps the satellite's own outgoing relations on the primary (re-pointed, non-self)", () => {
    const merged = mergeGeneratedSatellites([
      concept("app/ctf-quote"),
      concept("app/ctf-quote-gql", { relations: [{ targetId: "app/asset", evidence: "imports AssetFragment" }] }),
      concept("app/asset"),
    ]);
    const primary = merged.find((c) => c.id === "app/ctf-quote")!;
    expect(primary.relations).toContainEqual(expect.objectContaining({ targetId: "app/asset" }));
  });
});
```

- [ ] **Step 2: Run tests, verify they fail (module doesn't exist)**

Run: `npx vitest run scripts/okf-scan/code/merge-generated.test.ts`
Expected: FAIL — cannot resolve `./merge-generated`.

- [ ] **Step 3: Implement**

```typescript
// scripts/okf-scan/code/merge-generated.ts
import type { ConceptFacts, FactRelation } from "../types";

function leafOf(id: string): string {
  return id.split("/").pop() ?? id;
}

/**
 * "ctf-quote-gql" / "ctf-quote.generated" / "ctf-quote-gql.generated" -> "ctf-quote".
 * Returns the leaf unchanged when it carries no satellite suffix.
 */
export function satelliteBaseKey(leaf: string): string {
  let current = leaf;
  for (;;) {
    const next = current.replace(/(\.generated|-gql)$/, "");
    if (next === current) return current;
    current = next;
  }
}

/**
 * Folds GraphQL-codegen satellite concepts (leaf ending in "-gql" and/or
 * ".generated") into their base concept when that base exists as a sibling id:
 * one logical component instead of three. Relations across the whole concept
 * list are re-pointed at the primary, deduped per (source, target), and
 * intra-group edges (self-loops after the merge) are dropped. A satellite with
 * no existing primary stays standalone.
 */
export function mergeGeneratedSatellites(concepts: ConceptFacts[]): ConceptFacts[] {
  const byId = new Map(concepts.map((c) => [c.id, c]));

  const primaryOf = new Map<string, string>();
  for (const concept of concepts) {
    const leaf = leafOf(concept.id);
    const baseKey = satelliteBaseKey(leaf);
    if (baseKey === leaf) continue;
    const dir = concept.id.slice(0, concept.id.length - leaf.length);
    const primaryId = `${dir}${baseKey}`;
    const primary = byId.get(primaryId);
    if (!primary) continue;
    primaryOf.set(concept.id, primaryId);
  }
  if (primaryOf.size === 0) return concepts;

  const resolve = (id: string): string => primaryOf.get(id) ?? id;

  const merged: ConceptFacts[] = [];
  for (const concept of concepts) {
    if (primaryOf.has(concept.id)) continue;

    const satellites = concepts.filter((c) => primaryOf.get(c.id) === concept.id);
    const group = [concept, ...satellites];

    const seenTargets = new Set<string>();
    const relations: FactRelation[] = [];
    for (const rel of group.flatMap((c) => c.relations ?? [])) {
      const targetId = resolve(rel.targetId);
      if (targetId === concept.id) continue;
      if (seenTargets.has(targetId)) continue;
      seenTargets.add(targetId);
      relations.push({ ...rel, targetId });
    }

    const needsReview = group.flatMap((c) => c.needsReview ?? []);
    merged.push({
      ...concept,
      sourceFiles: group.flatMap((c) => c.sourceFiles),
      relations: relations.length > 0 || concept.relations ? relations : undefined,
      needsReview: needsReview.length > 0 ? needsReview : undefined,
    });
  }
  return merged;
}
```

- [ ] **Step 4: Run tests, verify all pass**

Run: `npx vitest run scripts/okf-scan/code/merge-generated.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/code/merge-generated.ts scripts/okf-scan/code/merge-generated.test.ts
git commit -m "feat(okf-scan): merge -gql/.generated satellite concepts into their base component"
```

---

### Task 2: `buildRouteHierarchy` — app→context, pages→containers, components by reachability

Pure transform run after the merge. Given the flat concept list of one frontend container:

- The app concept (`id === containerId`) becomes `level: "context", parentId: null` (mirrors `webapp-system.md`).
- Every `type: "Next.js Page"` concept becomes `level: "container"` (parentId stays the app). Its id does not change.
- Every other component is re-parented (and re-**id'd**, since a concept id doubles as its bundle file path) under:
  - the page that reaches it, when exactly **one** page reaches it via BFS over composition relations, or
  - a synthetic `<containerId>/shared-ui` container ("Shared UI & Utilities") when 0 or 2+ pages reach it.
- All `relations[].targetId` across **all** concepts are rewritten through the old→new id map.
- Components get `usedByRoutes` (the `routePath` of every page that reaches them) for Task 5's prose.
- A repo with **no pages** returns the input unchanged (the pages-less `frontend-repo` fixture keeps today's flat container shape — deliberate).

**Files:**
- Modify: `scripts/okf-scan/types.ts` (two new optional `ConceptFacts` fields)
- Create: `scripts/okf-scan/code/route-hierarchy.ts`
- Test: `scripts/okf-scan/code/route-hierarchy.test.ts`

- [ ] **Step 1: Add the two fields to `ConceptFacts` in `scripts/okf-scan/types.ts`**

Inside `interface ConceptFacts`, after `needsReview?: string[];`:

```typescript
  /** Pages Router route this page serves, e.g. "/" or "/blog/[slug]" — set only on Next.js Page concepts. */
  routePath?: string;
  /** routePaths of every page that reaches this component through static imports — set by buildRouteHierarchy. */
  usedByRoutes?: string[];
```

- [ ] **Step 2: Write the failing tests**

```typescript
// scripts/okf-scan/code/route-hierarchy.test.ts
import { describe, expect, it } from "vitest";
import { buildRouteHierarchy } from "./route-hierarchy";
import type { ConceptFacts } from "../types";

const APP = "web-storefront";

function app(): ConceptFacts {
  return { id: APP, type: "Frontend Application", level: "container", parentId: "platform", sourceFiles: [] };
}
function page(leaf: string, routePath: string, relations: { targetId: string }[] = []): ConceptFacts {
  return {
    id: `${APP}/${leaf}`, type: "Next.js Page", level: "component", parentId: APP, routePath,
    relations: relations.map((r) => ({ ...r, evidence: "imports" })), sourceFiles: [],
  };
}
function comp(leaf: string, relations: { targetId: string }[] = []): ConceptFacts {
  return {
    id: `${APP}/${leaf}`, type: "React Component", level: "component", parentId: APP,
    relations: relations.map((r) => ({ ...r, evidence: "imports" })), sourceFiles: [],
  };
}
const byId = (concepts: ConceptFacts[], id: string) => concepts.find((c) => c.id === id);

describe("buildRouteHierarchy", () => {
  it("promotes the app to a context-level root and pages to containers", () => {
    const result = buildRouteHierarchy([app(), page("index-page", "/")], APP);
    expect(byId(result, APP)).toMatchObject({ level: "context", parentId: null });
    expect(byId(result, `${APP}/index-page`)).toMatchObject({ level: "container", parentId: APP });
  });

  it("re-parents a component under the single page that reaches it, transitively", () => {
    const result = buildRouteHierarchy(
      [app(), page("index-page", "/", [{ targetId: `${APP}/layout` }]), comp("layout", [{ targetId: `${APP}/header` }]), comp("header")],
      APP,
    );
    expect(byId(result, `${APP}/index-page/layout`)).toMatchObject({
      parentId: `${APP}/index-page`, level: "component", usedByRoutes: ["/"],
    });
    expect(byId(result, `${APP}/index-page/header`)).toMatchObject({ parentId: `${APP}/index-page` });
  });

  it("puts a component reached by two pages, and one reached by none, under shared-ui", () => {
    const result = buildRouteHierarchy(
      [
        app(),
        page("index-page", "/", [{ targetId: `${APP}/button` }]),
        page("about", "/about", [{ targetId: `${APP}/button` }]),
        comp("button"),
        comp("orphan"),
      ],
      APP,
    );
    expect(byId(result, `${APP}/shared-ui/button`)).toMatchObject({
      parentId: `${APP}/shared-ui`, usedByRoutes: ["/", "/about"],
    });
    expect(byId(result, `${APP}/shared-ui/orphan`)).toMatchObject({ parentId: `${APP}/shared-ui` });
    expect(byId(result, `${APP}/shared-ui`)).toMatchObject({
      type: "Shared UI & Utilities", level: "container", parentId: APP,
    });
  });

  it("does not create shared-ui when every component has a unique owning page", () => {
    const result = buildRouteHierarchy(
      [app(), page("index-page", "/", [{ targetId: `${APP}/hero` }]), comp("hero")],
      APP,
    );
    expect(byId(result, `${APP}/shared-ui`)).toBeUndefined();
  });

  it("rewrites relation targets everywhere through the id map", () => {
    const result = buildRouteHierarchy(
      [app(), page("index-page", "/", [{ targetId: `${APP}/layout` }]), comp("layout")],
      APP,
    );
    const indexPage = byId(result, `${APP}/index-page`)!;
    expect(indexPage.relations![0].targetId).toBe(`${APP}/index-page/layout`);
  });

  it("leaves relation targets outside this container untouched (e.g. API concepts)", () => {
    const result = buildRouteHierarchy(
      [app(), page("index-page", "/", [{ targetId: "orders_api" }])],
      APP,
    );
    expect(byId(result, `${APP}/index-page`)!.relations![0].targetId).toBe("orders_api");
  });

  it("is a no-op for a container with no pages", () => {
    const input = [app(), comp("layout")];
    expect(buildRouteHierarchy(input, APP)).toEqual(input);
  });

  it("throws when a scanned concept already occupies the shared-ui id", () => {
    expect(() =>
      buildRouteHierarchy([app(), page("index-page", "/"), comp("shared-ui"), comp("x")], APP),
    ).toThrow(/shared-ui/);
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `npx vitest run scripts/okf-scan/code/route-hierarchy.test.ts`
Expected: FAIL — cannot resolve `./route-hierarchy`.

- [ ] **Step 4: Implement**

```typescript
// scripts/okf-scan/code/route-hierarchy.ts
import type { ConceptFacts } from "../types";

export const SHARED_UI_LEAF = "shared-ui";
const PAGE_TYPE = "Next.js Page";

/**
 * Restructures one frontend container's flat concept list into the C4 shape the
 * hand-authored webapp bundle uses (and validate-model.ts's strict one-level
 * nesting requires): the app becomes a context-level system, each Next.js page
 * becomes a drillable container (the user path), and every other component is
 * re-parented under the single page whose static-import graph reaches it — or
 * under a synthetic "shared-ui" container when 0 or 2+ pages reach it. Concept
 * ids double as bundle file paths, so re-parented components are re-id'd to
 * `<newParentId>/<leaf>` and every relation target in the list is rewritten
 * through the same map. A container with no pages is returned unchanged.
 */
export function buildRouteHierarchy(concepts: ConceptFacts[], containerId: string): ConceptFacts[] {
  const pages = concepts.filter((c) => c.parentId === containerId && c.type === PAGE_TYPE);
  if (pages.length === 0) return concepts;
  if (!concepts.some((c) => c.id === containerId)) return concepts;

  const byId = new Map(concepts.map((c) => [c.id, c]));
  const componentIds = new Set(
    concepts.filter((c) => c.parentId === containerId && c.type !== PAGE_TYPE).map((c) => c.id),
  );

  const sharedUiId = `${containerId}/${SHARED_UI_LEAF}`;
  if (byId.has(sharedUiId)) {
    throw new Error(
      `buildRouteHierarchy: concept id "${sharedUiId}" already exists — cannot create the shared-ui container`,
    );
  }

  // BFS per page over composition edges (relations targeting another scanned
  // non-page component of this same container).
  const reachedBy = new Map<string, Set<string>>();
  for (const p of pages) {
    const queue = (p.relations ?? []).map((r) => r.targetId).filter((t) => componentIds.has(t));
    const visited = new Set<string>(queue);
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      reachedBy.set(id, (reachedBy.get(id) ?? new Set()).add(p.id));
      for (const rel of byId.get(id)?.relations ?? []) {
        if (componentIds.has(rel.targetId) && !visited.has(rel.targetId)) {
          visited.add(rel.targetId);
          queue.push(rel.targetId);
        }
      }
    }
  }

  const parentFor = (componentId: string): string => {
    const pageIds = reachedBy.get(componentId);
    return pageIds?.size === 1 ? [...pageIds][0] : sharedUiId;
  };

  const idMap = new Map<string, string>();
  for (const id of componentIds) idMap.set(id, `${parentFor(id)}/${id.split("/").pop()}`);

  const rewriteRelations = (c: ConceptFacts): ConceptFacts =>
    c.relations
      ? { ...c, relations: c.relations.map((r) => ({ ...r, targetId: idMap.get(r.targetId) ?? r.targetId })) }
      : c;

  const pageIdSet = new Set(pages.map((p) => p.id));
  let sharedUiHasMembers = false;
  const result: ConceptFacts[] = [];
  for (const concept of concepts) {
    if (concept.id === containerId) {
      result.push(rewriteRelations({ ...concept, level: "context", parentId: null }));
    } else if (pageIdSet.has(concept.id)) {
      result.push(rewriteRelations({ ...concept, level: "container" }));
    } else if (componentIds.has(concept.id)) {
      const parentId = parentFor(concept.id);
      if (parentId === sharedUiId) sharedUiHasMembers = true;
      const usedByRoutes = [...(reachedBy.get(concept.id) ?? [])]
        .map((pageId) => byId.get(pageId)?.routePath)
        .filter((r): r is string => typeof r === "string")
        .sort();
      result.push(
        rewriteRelations({
          ...concept,
          id: idMap.get(concept.id)!,
          parentId,
          usedByRoutes: usedByRoutes.length > 0 ? usedByRoutes : undefined,
        }),
      );
    } else {
      result.push(rewriteRelations(concept));
    }
  }

  if (sharedUiHasMembers) {
    result.push({
      id: sharedUiId,
      type: "Shared UI & Utilities",
      level: "container",
      parentId: containerId,
      sourceFiles: [],
    });
  }
  return result;
}
```

- [ ] **Step 5: Run tests, verify all pass**

Run: `npx vitest run scripts/okf-scan/code/route-hierarchy.test.ts`
Expected: PASS (8 tests). Note the "no-op" test uses `toEqual` on the same array — the implementation returns the input reference untouched in that branch, which satisfies it.

- [ ] **Step 6: Commit**

```bash
git add scripts/okf-scan/types.ts scripts/okf-scan/code/route-hierarchy.ts scripts/okf-scan/code/route-hierarchy.test.ts
git commit -m "feat(okf-scan): build route-based C4 hierarchy from page import reachability"
```

---

### Task 3: Wire both transforms into `scanFrontendRepo` and update its tests

`scanFrontendRepo` gains: `routePath` on page concepts, then `return buildRouteHierarchy(mergeGeneratedSatellites(concepts), ctx.containerId)`. Also fix the frontend manifest-cache filter in `index.ts` (grandchildren no longer have `parentId === repoKey`).

**Fixture reachability (for exact expectations below), containerId `web-storefront`:** pages = `index-page` (imports `layout`), `about`, `[slug]`. `layout` → composition → `header`; `layout` → nav → `about`, `[slug]`; `footer` is imported only type-only (no edge). BFS: `layout`, `header` reached only from `index-page`; `footer` reached by none → shared-ui. New ids: `web-storefront/index-page/layout`, `web-storefront/index-page/header`, `web-storefront/shared-ui/footer`. New `widget` fixture (added below): merges 3 files into one concept, reached by no page → `web-storefront/shared-ui/widget`.

**Files:**
- Create: `scripts/okf-scan/code/__fixtures__/nextjs-repo/src/components/widget.tsx`, `widget-gql.tsx`, `widget.generated.tsx`
- Modify: `scripts/okf-scan/code/scan-frontend-repo.ts`
- Modify: `scripts/okf-scan/code/scan-frontend-repo.test.ts`
- Modify: `scripts/okf-scan/index.ts:125`

- [ ] **Step 1: Add the widget fixture files**

```typescript
// scripts/okf-scan/code/__fixtures__/nextjs-repo/src/components/widget.tsx
import { WidgetQuery } from './widget-gql';

export function Widget() {
  return <div>{WidgetQuery}</div>;
}
```

```typescript
// scripts/okf-scan/code/__fixtures__/nextjs-repo/src/components/widget-gql.tsx
import { WidgetFragment } from './widget.generated';

export const WidgetQuery = WidgetFragment;
```

```typescript
// scripts/okf-scan/code/__fixtures__/nextjs-repo/src/components/widget.generated.tsx
export const WidgetFragment = 'fragment WidgetFields on Widget { id }';
```

- [ ] **Step 2: Update existing expectations + add new failing tests in `scan-frontend-repo.test.ts`**

Apply these exact changes:

1. The `"scans a default-exported page under src/pages/ as a Next.js Page concept"` assertion becomes:
```typescript
    expect(homePage).toMatchObject({ type: "Next.js Page", level: "container", parentId: "web-storefront", routePath: "/" });
```
2. Every lookup of `web-storefront/layout` becomes `web-storefront/index-page/layout` (tests: "still scans an ordinary component", all 4 "composition relations" layout tests, both "navigation relations" layout tests, and both needsReview nav tests). In "still scans an ordinary component", also assert the new parent:
```typescript
    expect(layout).toMatchObject({ type: "React Component", level: "component", parentId: "web-storefront/index-page" });
```
3. In "creates a relation for a relative import", the expected target becomes `web-storefront/index-page/header`.
4. In "creates a relation for a tsconfig path-aliased import", the expected target becomes `web-storefront/index-page/layout`.
5. In "does not create a relation for a type-only import", the checked target becomes `web-storefront/shared-ui/footer`.
6. Navigation-relation targets stay `web-storefront/about` and `web-storefront/[slug]` — unchanged (pages keep their ids).
7. The first test ("emits a container concept for the repo itself…") uses `FIXTURE_DIR` (no `pages/`) and stays **unchanged** — it now also pins the no-pages no-op behavior.
8. Append these new tests at the end of the file:

```typescript
describe("scanFrontendRepo — route hierarchy & satellite merge", () => {
  it("promotes the app to a context-level system when the repo has pages", async () => {
    const concepts = await scanFrontendRepo({ repoDir: NEXTJS_FIXTURE_DIR, containerId: "web-storefront", apiBaseUrls: {} });
    expect(concepts.find((c) => c.id === "web-storefront")).toMatchObject({ level: "context", parentId: null });
  });

  it("parents a component no page reaches under a synthetic shared-ui container", async () => {
    const concepts = await scanFrontendRepo({ repoDir: NEXTJS_FIXTURE_DIR, containerId: "web-storefront", apiBaseUrls: {} });
    expect(concepts.find((c) => c.id === "web-storefront/shared-ui/footer")).toMatchObject({
      parentId: "web-storefront/shared-ui",
    });
    expect(concepts.find((c) => c.id === "web-storefront/shared-ui")).toMatchObject({
      type: "Shared UI & Utilities", level: "container", parentId: "web-storefront",
    });
  });

  it("merges -gql/.generated satellites into one concept with all three source files", async () => {
    const concepts = await scanFrontendRepo({ repoDir: NEXTJS_FIXTURE_DIR, containerId: "web-storefront", apiBaseUrls: {} });
    const widget = concepts.find((c) => c.id === "web-storefront/shared-ui/widget")!;
    expect(widget).toBeDefined();
    expect(widget.sourceFiles).toHaveLength(3);
    expect(concepts.some((c) => c.id.includes("widget-gql") || c.id.includes("widget.generated"))).toBe(false);
    expect(widget.relations ?? []).toHaveLength(0); // intra-triplet imports became self-loops and were dropped
  });

  it("sets routePath on dynamic pages", async () => {
    const concepts = await scanFrontendRepo({ repoDir: NEXTJS_FIXTURE_DIR, containerId: "web-storefront", apiBaseUrls: {} });
    expect(concepts.find((c) => c.id === "web-storefront/[slug]")).toMatchObject({ routePath: "/[slug]" });
  });
});
```

- [ ] **Step 3: Run tests, verify the new/updated ones fail for the right reason**

Run: `npx vitest run scripts/okf-scan/code/scan-frontend-repo.test.ts`
Expected: FAIL — ids/levels don't match yet (still flat, no merge, no routePath).

- [ ] **Step 4: Implement in `scan-frontend-repo.ts`**

Add imports at the top:
```typescript
import { mergeGeneratedSatellites } from "./merge-generated";
import { buildRouteHierarchy } from "./route-hierarchy";
```

Add next to `conceptIdForFile`:
```typescript
/** "index" -> "/", "[slug]" -> "/[slug]", "blog/[slug]" -> "/blog/[slug]". */
function routePathForPageFile(pagesRelative: string): string {
  const withoutExt = pagesRelative.replace(/\.(tsx?|jsx?)$/, "");
  const segments = withoutExt.split("/").filter(Boolean);
  if (segments[segments.length - 1] === "index") segments.pop();
  return `/${segments.join("/")}`;
}
```

In the final `concepts.push({...})`, after `parentId: ctx.containerId,` add:
```typescript
      routePath: parsed.isPage ? routePathForPageFile(pagesRelativePath(parsed.file, ctx.repoDir)!) : undefined,
```

Replace the closing `return concepts;` with:
```typescript
  return buildRouteHierarchy(mergeGeneratedSatellites(concepts), ctx.containerId);
```

- [ ] **Step 5: Fix the frontend manifest-cache filter in `scripts/okf-scan/index.ts`**

Line 125's filter no longer matches grandchildren (their `parentId` is a route id, not the repo key). Replace:
```typescript
      return cachedConceptsFor(manifest, (f) => f.id === result.ref.key || f.parentId === result.ref.key);
```
with:
```typescript
      // Nested route hierarchy: components' parentId is a route/shared-ui id, not
      // the repo key — but every concept in this repo's tree has an id under the
      // repo key's path (ids double as bundle paths).
      return cachedConceptsFor(manifest, (f) => f.id === result.ref.key || f.id.startsWith(`${result.ref.key}/`));
```
(No dedicated unit test — `main()` glue; covered by Task 8's end-to-end regeneration.)

- [ ] **Step 6: Run the scanner test file, then the full suite**

Run: `npx vitest run scripts/okf-scan/code/scan-frontend-repo.test.ts`
Expected: PASS.
Run: `npx vitest run`
Expected: everything green except the pre-existing `llm.test.ts` "throws immediately when no API key" failure (env-dependent, unrelated — present before this plan).

- [ ] **Step 7: Commit**

```bash
git add scripts/okf-scan/code scripts/okf-scan/index.ts
git commit -m "feat(okf-scan): emit route-hierarchy bundles from the frontend scanner"
```

---

### Task 4: Organizer cap + skip small containers

Two changes: (a) `organize.ts`'s prompt caps groups at 8 and forbids groups smaller than 3 members; (b) `synthesize.ts` skips organizing containers with ≤ 8 children (route containers are small by construction; grouping 5 nodes adds noise, not signal).

**Files:**
- Modify: `scripts/okf-scan/synthesize/organize.ts:35-55` (buildPrompt)
- Modify: `scripts/okf-scan/synthesize/synthesize.ts:174-177`
- Test: `scripts/okf-scan/synthesize/synthesize.test.ts`

- [ ] **Step 1: Write the failing test for the organizer skip**

Add to `scripts/okf-scan/synthesize/synthesize.test.ts`. The file already has the harness these tests use: a `bundleDir` created per-test via `mkdtemp` in `beforeEach`, a `fakeLlm()` helper returning `{ client, calls }` (hence `llm: fakeLlm().client` below), and `OrganizerClient` imported from `./organize`; `ScanResult` comes from `../types`:

```typescript
it("does not call the organizer for a container with 8 or fewer children", async () => {
  const organizedContainers: string[] = [];
  const recordingOrganizer: OrganizerClient = {
    async organizeChildren(containerId) {
      organizedContainers.push(containerId);
      return {};
    },
  };
  const children = Array.from({ length: 8 }, (_, i) => ({
    id: `small/c${i}`, type: "React Component", level: "component" as const, parentId: "small", sourceFiles: [],
  }));
  const scanResult: ScanResult = {
    lambdaEnvVarBindings: {},
    groups: [],
    concepts: [
      { id: "small", type: "Frontend Application", level: "container", parentId: "platform", sourceFiles: [] },
      ...children,
    ],
  };

  await synthesize({ scanResult, bundleDir, llm: fakeLlm().client, organizer: recordingOrganizer });

  expect(organizedContainers).toEqual([]);
});

it("still calls the organizer for a container with 9 or more children", async () => {
  const organizedContainers: string[] = [];
  const recordingOrganizer: OrganizerClient = {
    async organizeChildren(containerId) {
      organizedContainers.push(containerId);
      return {};
    },
  };
  const children = Array.from({ length: 9 }, (_, i) => ({
    id: `big/c${i}`, type: "React Component", level: "component" as const, parentId: "big", sourceFiles: [],
  }));
  const scanResult: ScanResult = {
    lambdaEnvVarBindings: {},
    groups: [],
    concepts: [
      { id: "big", type: "Frontend Application", level: "container", parentId: "platform", sourceFiles: [] },
      ...children,
    ],
  };

  await synthesize({ scanResult, bundleDir, llm: fakeLlm().client, organizer: recordingOrganizer });

  expect(organizedContainers).toEqual(["big"]);
});
```

- [ ] **Step 2: Run, verify the first new test fails**

Run: `npx vitest run scripts/okf-scan/synthesize/synthesize.test.ts`
Expected: FAIL — organizer called for the 8-child container.

- [ ] **Step 3: Implement the skip in `synthesize.ts`**

Above `synthesize()`, add:
```typescript
/** Containers at or below this many children skip the organizer entirely — a
 *  view this small is already scannable, and grouping it adds noise. Matches
 *  the layout renderer's maxRowsPerLayer default plus headroom. */
const ORGANIZE_MIN_CHILDREN = 9;
```
Change the `containersNeedingOrganizing` filter to:
```typescript
  const containersNeedingOrganizing = Array.from(childrenByParent.entries()).filter(
    ([, children]) => children.length >= ORGANIZE_MIN_CHILDREN && children.some((c) => regeneratingIds.has(c.id)),
  );
```

- [ ] **Step 4: Update the organizer prompt in `organize.ts`**

In `buildPrompt`, replace the first line string with:
```typescript
    "You are grouping the components of one software container into a small number of named, coherent conceptual groups (bounded contexts) for an architecture diagram — the goal is to make a large flat list of components easy for a human to scan by clustering related ones together. Create at most 8 groups in total (aim for 3-6), and never create a group with fewer than 3 members — fold what would be a tiny group into the most closely related larger one instead.",
```
(The rest of the prompt is unchanged; there is no unit test for prompt prose — the parse-side tests in `organize.test.ts` are unaffected.)

- [ ] **Step 5: Run, verify green**

Run: `npx vitest run scripts/okf-scan/synthesize/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/okf-scan/synthesize/organize.ts scripts/okf-scan/synthesize/synthesize.ts scripts/okf-scan/synthesize/synthesize.test.ts
git commit -m "feat(okf-scan): cap organizer groups at 8 and skip containers with few children"
```

---

### Task 5: Route-anchored, anti-boilerplate prose prompt

`buildPrompt` in `llm.ts` gains the route facts and stops producing generic filler. Export `buildPrompt` so it's directly testable (it's pure).

**Files:**
- Modify: `scripts/okf-scan/synthesize/llm.ts:7-39`
- Test: `scripts/okf-scan/synthesize/llm.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `llm.test.ts`:

```typescript
import { buildPrompt } from "./llm";

describe("buildPrompt — route anchoring", () => {
  const base = { id: "app/hero", type: "React Component", level: "component" as const, parentId: "app", sourceFiles: [] };

  it("includes the page's route when routePath is set", () => {
    expect(buildPrompt({ ...base, routePath: "/blog/[slug]" })).toContain('serving route "/blog/[slug]"');
  });

  it("includes usedByRoutes when set", () => {
    expect(buildPrompt({ ...base, usedByRoutes: ["/", "/about"] })).toContain("used on route(s): /, /about");
  });

  it("forbids generic boilerplate openers and description restating", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain('never open with generic filler like "This concept represents"');
    expect(prompt).toContain("must add new information rather than restating");
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run scripts/okf-scan/synthesize/llm.test.ts`
Expected: FAIL — `buildPrompt` is not exported / prompt lacks the strings.

- [ ] **Step 3: Implement in `llm.ts`**

Change `function buildPrompt` to `export function buildPrompt`. In `optionalLines`, after the `facts.awsResourceType` entry, add:
```typescript
    facts.routePath ? `This concept is the page serving route "${facts.routePath}" in the application.` : "",
    facts.usedByRoutes?.length ? `This component is used on route(s): ${facts.usedByRoutes.join(", ")}.` : "",
```
Replace the first `instructionLines` entry with:
```typescript
    'Write 1-3 short paragraphs of plain prose describing what this concept is and how it\'s used, grounded only in the facts above. Do not invent fields, relations, or capabilities not listed. Do not include a heading or any markdown section markers — just the prose paragraphs. Write for a developer reading an architecture map: never open with generic filler like "This concept represents"; when a route is given, anchor the description in where the concept appears in the user\'s journey through the app. The first paragraph doubles as a short standalone summary shown separately in the diagram, so any following paragraphs must add new information rather than restating it.',
```

- [ ] **Step 4: Run, verify green**

Run: `npx vitest run scripts/okf-scan/synthesize/llm.test.ts`
Expected: the 3 new tests PASS. (The pre-existing "throws immediately when no API key is available" failure is environmental — a locally-set `ANTHROPIC_API_KEY` defeats its premise — and predates this plan; leave it as-is.)

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/synthesize/llm.ts scripts/okf-scan/synthesize/llm.test.ts
git commit -m "feat(okf-scan): anchor concept prose in routes and ban boilerplate openers"
```

---

### Task 6: Stop duplicating the description paragraph in the body

Today `buildConceptMarkdown` uses `prose.split("\n\n")[0]` as the frontmatter `description` **and** keeps the full prose as the body — the wiki panel then shows the same paragraph twice back-to-back. Fix: body keeps only the paragraphs after the first.

**Files:**
- Modify: `scripts/okf-scan/synthesize/markdown.ts:161-184`
- Test: `scripts/okf-scan/synthesize/markdown.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `markdown.test.ts` (reuse its existing helper conventions for calling `buildConceptMarkdown` — it already tests description extraction):

```typescript
it("does not repeat the description paragraph in the body", () => {
  const markdown = buildConceptMarkdown({
    facts: { id: "app/hero", type: "React Component", level: "component", parentId: "app", sourceFiles: [] },
    prose: "First paragraph, the summary.\n\nSecond paragraph, extra detail.",
    preserved: { links: [] },
    conceptTitles: {},
    groups: [],
  });
  expect(markdown).toContain("description: First paragraph, the summary.");
  expect(markdown).toContain("Second paragraph, extra detail.");
  // the body must not restate the description paragraph
  expect(markdown.split("First paragraph, the summary.")).toHaveLength(2);
});

it("emits no body prose at all for single-paragraph prose (description carries it)", () => {
  const markdown = buildConceptMarkdown({
    facts: { id: "app/hero", type: "React Component", level: "component", parentId: "app", sourceFiles: [] },
    prose: "Only paragraph.",
    preserved: { links: [] },
    conceptTitles: {},
    groups: [],
  });
  expect(markdown).toContain("description: Only paragraph.");
  expect(markdown.split("Only paragraph.")).toHaveLength(2);
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run scripts/okf-scan/synthesize/markdown.test.ts`
Expected: FAIL — paragraph appears twice.

- [ ] **Step 3: Implement in `buildConceptMarkdown`**

Replace:
```typescript
  const frontmatter: Frontmatter = {
    type: facts.type,
    title: titleize(facts.id),
    description: prose.split("\n\n")[0] ?? "",
    level: facts.level,
  };
```
with:
```typescript
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
```
and in `sections`, replace the `prose` entry with `bodyProse`:
```typescript
  const sections = [
    bodyProse,
    buildSchemaSection(facts.schema),
    buildRelationsSection(facts, conceptTitles),
    buildLinksSection(preserved.links),
  ].filter((s) => s.length > 0);
```

- [ ] **Step 4: Run markdown tests + full synthesize suite (existing tests may assert the old body shape — update any that assert the first paragraph appears in the body, keeping their intent: description extraction still works)**

Run: `npx vitest run scripts/okf-scan/synthesize/`
Expected: PASS after adjusting any old-shape assertions.

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/synthesize/markdown.ts scripts/okf-scan/synthesize/markdown.test.ts
git commit -m "fix(okf-scan): stop repeating the description paragraph in concept bodies"
```

---

### Task 7: Root files for context-level frontend systems

`writeRootFiles` currently only lists `parentId === ROOT_CONTEXT_ID` concepts in the bundle root `index.md`, and always writes `platform.md`. After Task 3, a frontend system has `parentId: null` and would be **unreachable** (okf-import only discovers files via index.md links). Also: a frontend-only bundle should not draw the default "AWS Cloud" boundary box or a pointless empty `platform` node.

**Files:**
- Modify: `scripts/okf-scan/synthesize/synthesize.ts:292-319` (writeRootFiles)
- Test: `scripts/okf-scan/e2e.test.ts`

- [ ] **Step 1: Write the failing end-to-end test**

Add to `e2e.test.ts` inside the existing describe (reuses `makeFsIo`/`fakeLlm`/`bundleDir`):

```typescript
it("produces a valid bundle for a frontend route-hierarchy scan (context app → route containers → components)", async () => {
  const scanResult: ScanResult = {
    lambdaEnvVarBindings: {},
    groups: [],
    concepts: [
      { id: "shop", type: "Frontend Application", level: "context", parentId: null, sourceFiles: [] },
      { id: "shop/index-page", type: "Next.js Page", level: "container", parentId: "shop", routePath: "/", sourceFiles: [] },
      {
        id: "shop/index-page/hero", type: "React Component", level: "component", parentId: "shop/index-page",
        usedByRoutes: ["/"], sourceFiles: [],
      },
      { id: "shop/shared-ui", type: "Shared UI & Utilities", level: "container", parentId: "shop", sourceFiles: [] },
      { id: "shop/shared-ui/button", type: "React Component", level: "component", parentId: "shop/shared-ui", sourceFiles: [] },
    ],
  };

  await synthesize({ scanResult, bundleDir, llm: fakeLlm });

  const model = await importOkfBundle(BUNDLE_VIRTUAL_ROOT, makeFsIo(bundleDir)).then(validateArchModel);

  expect(model.nodes.map((n) => n.id).sort()).toEqual([
    "shop", "shop/index-page", "shop/index-page/hero", "shop/shared-ui", "shop/shared-ui/button",
  ]);
  expect(model.nodes.find((n) => n.id === "shop")).toMatchObject({ level: "context", parentId: null });
  expect(model.nodes.find((n) => n.id === "shop/index-page")).toMatchObject({ level: "container", parentId: "shop" });
  expect(model.nodes.find((n) => n.id === "shop/index-page/hero")).toMatchObject({ parentId: "shop/index-page" });
  // frontend-only bundle: no platform node, no default AWS Cloud boundary
  expect(model.nodes.some((n) => n.id === "platform")).toBe(false);
  expect(model.boundary).toBe(false);
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run scripts/okf-scan/e2e.test.ts`
Expected: FAIL — `shop` isn't listed in index.md (unreachable), and/or platform node present.

- [ ] **Step 3: Implement in `writeRootFiles`**

Replace the body of `writeRootFiles` with:

```typescript
async function writeRootFiles(bundleDir: string, scanResult: ScanResult, conceptTitles: Record<string, string>): Promise<void> {
  await mkdir(bundleDir, { recursive: true });

  // A frontend system scanned into a route hierarchy is its own context-level
  // root (parentId null) — the synthetic "platform" context only exists to hold
  // terraform/lambda containers, so skip it (and the default AWS Cloud boundary)
  // entirely for a bundle that has nothing attached to it.
  const hasPlatformChildren = scanResult.concepts.some((c) => c.parentId === ROOT_CONTEXT_ID);
  if (hasPlatformChildren) {
    const platformLines = ["---", "type: Software System", "title: Platform", "level: context", "---", "", "Generated by scripts/okf-scan."];
    await writeFile(path.join(bundleDir, "platform.md"), `${platformLines.join("\n")}\n`, "utf-8");
  }

  const topLevel = scanResult.concepts.filter((c) => c.parentId === ROOT_CONTEXT_ID || c.parentId === null);
  const conceptLinks = topLevel.map((c) => `- [${conceptTitles[c.id]}](${c.id}.md) - ${c.type}`);
  const groupsLink =
    scanResult.groups.length > 0
      ? ["", "# Groups", "", "- [AWS Network Groups](groups/index.md) - region/VPC/AZ/subnet boundaries"]
      : [];

  const indexLines = [
    "---",
    'title: "Generated Architecture"',
    ...(!hasPlatformChildren && scanResult.groups.length === 0 ? ["boundary: false"] : []),
    "---",
    "",
    "# Concepts",
    "",
    ...(hasPlatformChildren ? ["- [Platform](platform.md) - root system node"] : []),
    ...conceptLinks,
    ...groupsLink,
  ];
  await writeFile(path.join(bundleDir, "index.md"), `${indexLines.join("\n")}\n`, "utf-8");

  if (scanResult.groups.length > 0) await writeGroupFiles(bundleDir, scanResult.groups);
}
```

- [ ] **Step 4: Run e2e + full synthesize suite (the pre-existing lambda e2e test must stay green — it has platform children, so its path is unchanged)**

Run: `npx vitest run scripts/okf-scan/e2e.test.ts scripts/okf-scan/synthesize/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/synthesize/synthesize.ts scripts/okf-scan/e2e.test.ts
git commit -m "feat(okf-scan): reachable root links and boundary:false for frontend-only bundles"
```

---

### Task 8: Full verification + regenerate the blog bundle

- [ ] **Step 1: Full suite + type-check**

Run: `npx vitest run`
Expected: all green except the pre-existing environmental `llm.test.ts` API-key failure.
Run: `npx tsc --noEmit -p .`
Expected: no errors under `scripts/` or `src/` (errors under `example/` are pre-existing and out of scope).

- [ ] **Step 2: Regenerate the blog bundle from scratch**

The manifest lives inside the bundle dir, so wiping it forces a clean regeneration. Requires `ANTHROPIC_API_KEY` in the environment (ask the user to provide/confirm it — do not read or echo the value).

```bash
rm -rf public/okf-bundles/blog
npx tsx scripts/okf-scan/index.ts --repo-map repo-map.yaml --env dev --out public/okf-bundles/blog --force
```
Expected: `okf-scan: wrote N … concept(s) into public/okf-bundles/blog`, with N ≈ 50–60 (down from ~87: satellites merged) and new subdirectories per route (e.g. `template-marketing-webapp-nextjs/index-page/`, `.../shared-ui/`).

- [ ] **Step 3: Validate every data source**

Run: `npm run validate`
Expected: all sources valid, including `blog` (strict level nesting passes: context → container → component).

- [ ] **Step 4: Manual browser verification (dev server running)**

1. Open `http://localhost:3000/?source=blog` — root Context view should show the frontend system node (no empty "Platform", no AWS Cloud box).
2. Drill into the system — expect ~4-8 route containers + `Shared Ui` instead of 24 clusters; relations between them arrive as single aggregated edges.
3. Drill into one route — its own components with intra-route composition edges.
4. Compare side-by-side with `http://localhost:3000/?source=webapp-frontend-okf&parent=webapp-system` — the shapes should now match structurally.
5. Open the Wiki tab on any concept — description paragraph must not repeat at the top of the body.

- [ ] **Step 5: Commit the regenerated bundle**

```bash
git add public/okf-bundles/blog
git commit -m "chore(okf-scan): regenerate blog bundle with route hierarchy and merged satellites"
```

---

## Self-review notes

- **Spec coverage:** adjustment 1 (route hierarchy) → Tasks 2, 3, 7; adjustment 2 (triplet merge) → Task 1, wired in Task 3; adjustment 3 (relation noise) → merge-time dedupe/self-loop removal (Task 1) + view-time rollup made effective by the hierarchy itself (no separate code needed — documented in header); adjustment 4 (organizer cap) → Task 4; adjustment 5 (route-anchored prose + description dedupe) → Tasks 5, 6.
- **Known judgment calls:** `ORGANIZE_MIN_CHILDREN = 9` and the 3-to-8 group cap are tunable constants; the shared-ui id collision throws rather than renames (deterministic failure over silent surprise); a no-pages repo keeps today's flat container shape on purpose.
- **Out of scope:** deleting stale `.md` files left behind by re-idd'd concepts is handled by wiping the bundle dir in Task 8 (synthesize has no delete pass — pre-existing limitation); App Router (`app/`) repos — scanner remains Pages Router only.
