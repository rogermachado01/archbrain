# Bounded-Context Cluster Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn each distinct `ddd_context` among a container's children into a collapsible
cluster pseudo-node, so a container with many tagged children (e.g. the `blog` bundle's
76-component `template-marketing-webapp-nextjs`) shows a handful of clusters by default instead
of every child at once — double-clicking a cluster drills into it exactly like the app's existing
Context → Container → Component navigation.

**Architecture:** A new pure module, `src/lib/clusters.ts`, derives cluster pseudo-nodes
(`ArchNode`-shaped, tagged via a new `synthetic` field) purely from `node.ddd.context` — no
`ArchModel`/data changes. `src/lib/model.ts`'s relation-rollup gets an optional `clusterOverride`
map so relations between two clustered siblings roll up to their cluster nodes instead of being
dropped. `ArchVizApp.tsx` derives an "effective cluster" (explicit `?cluster=` param, or a
fallback from the selected node's own membership) and swaps `visibleNodes` between the cluster
list and one cluster's real members — `ArchitectureGraph.tsx` needs almost no changes, since
cluster pseudo-nodes are ordinary interactive `ArchNode`s to it. One real fix is needed there: the
"Bounded Context" box overlay must require ≥2 distinct contexts to draw a box, or it draws a
pointless box around the *entire* view every time you drill into a single cluster (all members
share one context there).

**Tech Stack:** TypeScript, React, AntV X6, Vitest.

**Design doc:** `docs/superpowers/specs/2026-07-06-bounded-context-clusters-design.md`

---

## Task 1: Wire `src/**/*.test.ts` into vitest

**Files:**
- Modify: `vitest.config.ts`
- Modify: `CLAUDE.md`
- Create (temporary, deleted at end of task): `src/lib/_smoke.test.ts`

Today's `vitest.config.ts` only includes `scripts/**/*.test.ts` — a test file under `src/lib/`
would silently never run under `npm run test`. This task fixes that before any TDD work in later
tasks depends on it.

- [ ] **Step 1: Write a temporary smoke test to prove the current config does NOT pick up `src/`**

Create `src/lib/_smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run the full suite and confirm this file is NOT picked up**

Run: `npx vitest run --reporter=verbose 2>&1 | grep -i smoke`
Expected: no output (the file exists but vitest's `include` pattern doesn't match it).

- [ ] **Step 3: Widen the vitest include pattern**

In `vitest.config.ts`, change:

```ts
  test: {
    include: ["scripts/**/*.test.ts"],
  },
```

to:

```ts
  test: {
    include: ["scripts/**/*.test.ts", "src/**/*.test.ts"],
  },
```

- [ ] **Step 4: Re-run and confirm the smoke test now runs**

Run: `npx vitest run --reporter=verbose 2>&1 | grep -i smoke`
Expected: one line showing `smoke > runs` passing.

- [ ] **Step 5: Delete the temporary smoke test**

```bash
rm src/lib/_smoke.test.ts
```

- [ ] **Step 6: Fix the now-stale CLAUDE.md claim that no test runner exists for the frontend**

In `CLAUDE.md`, find this line in the "Commands" section:

```
npx tsc --noEmit -p .   # type-check only, no test runner is configured yet
```

Change it to:

```
npx vitest run          # unit tests (scripts/okf-scan/**, src/lib/**)
npx tsc --noEmit -p .   # type-check only
```

Find this paragraph right after the commands code block:

```
There is no test suite yet — do not assume a `test` script exists.
```

Replace it with:

```
`npm run test` runs the full Vitest suite (`scripts/okf-scan/**/*.test.ts` and
`src/lib/**/*.test.ts`). There is still no automated test coverage for React components
(`src/components/**`) — those are verified manually in a browser; see "Rendering pipeline" below.
```

- [ ] **Step 7: Run the full suite once more to confirm nothing broke**

Run: `npx vitest run`
Expected: all existing `scripts/okf-scan/**` tests still pass (same count as before this task);
no new failures.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts CLAUDE.md
git commit -m "chore: run src/lib/**/*.test.ts under vitest, not just scripts/**"
```

---

## Task 2: `src/lib/clusters.ts` — pure cluster derivation

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/clusters.ts`
- Create: `src/lib/clusters.test.ts`

- [ ] **Step 1: Add the `synthetic` field to `ArchNode`**

In `src/lib/types.ts`, change:

```ts
  /** DDD strategic/tactical metadata, if this node represents a modeled domain concept */
  ddd?: DddInfo;
}
```

to:

```ts
  /** DDD strategic/tactical metadata, if this node represents a modeled domain concept */
  ddd?: DddInfo;
  /**
   * Set only on cluster pseudo-nodes synthesized by computeClusterView
   * (src/lib/clusters.ts) — never present on a real, data-sourced ArchNode.
   * Marks this node as a collapsed group of real children, not an actual
   * resource, so UI code can branch on "is this a real thing to configure."
   */
  synthetic?: {
    kind: "bounded-context-cluster";
    memberIds: string[];
  };
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/clusters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeClusterView, CLUSTER_ID_PREFIX, UNGROUPED_CLUSTER_ID } from "./clusters";
import type { ArchNode } from "./types";

function node(id: string, context?: string): ArchNode {
  return { id, name: id, level: "component", parentId: "container-1", ddd: context ? { context } : undefined };
}

describe("computeClusterView", () => {
  it("returns null when no child has a ddd.context", () => {
    const children = [node("a"), node("b")];
    expect(computeClusterView(children)).toBeNull();
  });

  it("groups children sharing a ddd.context into one cluster node", () => {
    const children = [node("a", "Navigation"), node("b", "Navigation"), node("c", "Settings")];
    const view = computeClusterView(children)!;

    expect(view.clusterNodes).toHaveLength(2);
    const nav = view.clusterNodes.find((c) => c.id === `${CLUSTER_ID_PREFIX}Navigation`)!;
    expect(nav.name).toBe("Navigation (2)");
    expect(nav.synthetic).toEqual({ kind: "bounded-context-cluster", memberIds: ["a", "b"] });
    expect(nav.level).toBe("component");
    expect(nav.parentId).toBe("container-1");

    const settings = view.clusterNodes.find((c) => c.id === `${CLUSTER_ID_PREFIX}Settings`)!;
    expect(settings.synthetic?.memberIds).toEqual(["c"]);
  });

  it("populates membershipByChildId for every child", () => {
    const children = [node("a", "Navigation"), node("b", "Settings")];
    const view = computeClusterView(children)!;

    expect(view.membershipByChildId.get("a")).toBe(`${CLUSTER_ID_PREFIX}Navigation`);
    expect(view.membershipByChildId.get("b")).toBe(`${CLUSTER_ID_PREFIX}Settings`);
  });

  it("buckets children with no ddd.context into a synthetic Outros cluster", () => {
    const children = [node("a", "Navigation"), node("b"), node("c")];
    const view = computeClusterView(children)!;

    const outros = view.clusterNodes.find((c) => c.id === UNGROUPED_CLUSTER_ID)!;
    expect(outros).toBeDefined();
    expect(outros.name).toBe("Outros (2)");
    expect(outros.synthetic?.memberIds).toEqual(["b", "c"]);
    expect(view.membershipByChildId.get("b")).toBe(UNGROUPED_CLUSTER_ID);
  });

  it("does not create an Outros cluster when every child has a context", () => {
    const children = [node("a", "Navigation"), node("b", "Settings")];
    const view = computeClusterView(children)!;

    expect(view.clusterNodes.find((c) => c.id === UNGROUPED_CLUSTER_ID)).toBeUndefined();
  });

  it("sorts cluster nodes alphabetically by name for stable render order", () => {
    const children = [node("a", "Zebra"), node("b", "Alpha")];
    const view = computeClusterView(children)!;

    expect(view.clusterNodes.map((c) => c.name)).toEqual(["Alpha (1)", "Zebra (1)"]);
  });
});
```

- [ ] **Step 3: Run the tests and verify they fail because the module doesn't exist**

Run: `npx vitest run src/lib/clusters.test.ts`
Expected: FAIL with `Cannot find module './clusters'`.

- [ ] **Step 4: Implement `src/lib/clusters.ts`**

```ts
import type { ArchNode } from "./types";

/** Namespace for synthesized cluster pseudo-node ids — never collides with a real ArchNode id. */
export const CLUSTER_ID_PREFIX = "__cluster__:";

/** Fixed sentinel id for children with no ddd.context, bucketed together rather than shown loose. */
export const UNGROUPED_CLUSTER_ID = `${CLUSTER_ID_PREFIX}__ungrouped__`;

export interface ClusterView {
  /** One synthetic ArchNode per distinct ddd.context among the input children, plus an "Outros" node if any child has none. */
  clusterNodes: ArchNode[];
  /** Real child id -> the id (from clusterNodes) it belongs to. */
  membershipByChildId: Map<string, string>;
}

/**
 * Derives a collapsible-cluster view of a container's children from their
 * ddd.context values alone — pure and stateless, mirroring how
 * computeBoundedContextBoxes (groups.ts) already derives box overlays from
 * the same field. Returns null when no child has ddd.context set, so a
 * container with no DDD tagging renders exactly as it always has.
 */
export function computeClusterView(children: ArchNode[]): ClusterView | null {
  if (!children.some((c) => c.ddd?.context)) return null;

  const idsByContext = new Map<string, string[]>();
  const ungroupedIds: string[] = [];
  children.forEach((child) => {
    if (child.ddd?.context) {
      idsByContext.set(child.ddd.context, [...(idsByContext.get(child.ddd.context) ?? []), child.id]);
    } else {
      ungroupedIds.push(child.id);
    }
  });

  const level = children[0].level;
  const parentId = children[0].parentId ?? null;
  const clusterNodes: ArchNode[] = [];
  const membershipByChildId = new Map<string, string>();

  idsByContext.forEach((memberIds, contextName) => {
    const id = `${CLUSTER_ID_PREFIX}${contextName}`;
    clusterNodes.push({
      id,
      name: `${contextName} (${memberIds.length})`,
      level,
      parentId,
      synthetic: { kind: "bounded-context-cluster", memberIds },
    });
    memberIds.forEach((memberId) => membershipByChildId.set(memberId, id));
  });

  if (ungroupedIds.length > 0) {
    clusterNodes.push({
      id: UNGROUPED_CLUSTER_ID,
      name: `Outros (${ungroupedIds.length})`,
      level,
      parentId,
      synthetic: { kind: "bounded-context-cluster", memberIds: ungroupedIds },
    });
    ungroupedIds.forEach((memberId) => membershipByChildId.set(memberId, UNGROUPED_CLUSTER_ID));
  }

  clusterNodes.sort((a, b) => a.name.localeCompare(b.name));

  return { clusterNodes, membershipByChildId };
}
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `npx vitest run src/lib/clusters.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors (pre-existing errors, if any, are confined to the untracked `example/`
directory).

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/clusters.ts src/lib/clusters.test.ts
git commit -m "feat(clusters): add computeClusterView, deriving bounded-context clusters from ddd.context"
```

---

## Task 3: `src/lib/model.ts` — cluster-aware relation rollup

**Files:**
- Modify: `src/lib/model.ts`
- Create: `src/lib/model.test.ts`

`src/lib/model.ts` currently has no test file at all. This task adds one, scoped only to the new
`clusterOverride` behavior being added here (not a general backfill of coverage for pre-existing
untested functions — out of scope for this plan).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/model.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getRelationsForViewWithRollup } from "./model";
import type { ArchModel } from "./types";

function buildModel(): ArchModel {
  return {
    nodes: [
      { id: "container-1", name: "Container 1", level: "container", parentId: null },
      { id: "container-1/a", name: "A", level: "component", parentId: "container-1", ddd: { context: "Navigation" } },
      { id: "container-1/b", name: "B", level: "component", parentId: "container-1", ddd: { context: "Navigation" } },
      { id: "container-1/c", name: "C", level: "component", parentId: "container-1", ddd: { context: "Settings" } },
      { id: "container-1/d", name: "D", level: "component", parentId: "container-1" },
    ],
    relations: [
      { id: "r1", source: "container-1/a", target: "container-1/c", kind: "sync" },
      { id: "r2", source: "container-1/b", target: "container-1/d", kind: "sync" },
    ],
  };
}

describe("getRelationsForViewWithRollup with clusterOverride", () => {
  it("rolls up a relation between two different clusters to an edge between the cluster ids", () => {
    const model = buildModel();
    const clusterOverride = new Map([
      ["container-1/a", "__cluster__:Navigation"],
      ["container-1/b", "__cluster__:Navigation"],
      ["container-1/c", "__cluster__:Settings"],
      ["container-1/d", "__cluster__:__ungrouped__"],
    ]);
    const visibleIds = new Set(["__cluster__:Navigation", "__cluster__:Settings", "__cluster__:__ungrouped__"]);

    const relations = getRelationsForViewWithRollup(model, visibleIds, clusterOverride);

    expect(relations).toHaveLength(2);
    const r1 = relations.find((r) => r.id === "rollup:__cluster__:Navigation->__cluster__:Settings");
    expect(r1).toMatchObject({ source: "__cluster__:Navigation", target: "__cluster__:Settings" });
    const r2 = relations.find((r) => r.id === "rollup:__cluster__:Navigation->__cluster__:__ungrouped__");
    expect(r2).toMatchObject({ source: "__cluster__:Navigation", target: "__cluster__:__ungrouped__" });
  });

  it("drops a relation to a sibling cluster's member when drilled into just one cluster (no override passed)", () => {
    const model = buildModel();
    // Drilled into the "Navigation" cluster: only its real members are visible, no override.
    const visibleIds = new Set(["container-1/a", "container-1/b"]);

    const relations = getRelationsForViewWithRollup(model, visibleIds);

    // r1 (a -> c) and r2 (b -> d) both target a node outside this cluster with no
    // override to resolve through, so neither rolls up — same as today's existing
    // sibling-container behavior.
    expect(relations).toHaveLength(0);
  });

  it("behaves exactly as before when no clusterOverride is passed (backward compatible)", () => {
    const model = buildModel();
    const visibleIds = new Set(["container-1"]);

    const relations = getRelationsForViewWithRollup(model, visibleIds);

    // Both real relations are between components under container-1, which is visible.
    // Both endpoints resolve to the same visible ancestor (container-1 itself), so
    // per the existing "src === tgt" drop rule these are internal and produce no edges —
    // exactly the same outcome getRelationsForViewWithRollup already produced for this
    // input before clusterOverride was added.
    expect(relations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run src/lib/model.test.ts`
Expected: FAIL — `getRelationsForViewWithRollup` doesn't yet accept a 3rd argument, so the first
test's rollup won't happen (relations come back empty instead of length 2).

- [ ] **Step 3: Implement the `clusterOverride` parameter**

In `src/lib/model.ts`, change:

```ts
/** Walks up the parentId chain from id until it finds a node in visibleIds, or null if none. */
function nearestVisibleAncestor(model: ArchModel, id: string, visibleIds: Set<string>): string | null {
  let current = findNode(model, id);
  while (current) {
    if (visibleIds.has(current.id)) return current.id;
    current = current.parentId ? findNode(model, current.parentId) : undefined;
  }
  return null;
}
```

to:

```ts
/**
 * Walks up the parentId chain from id until it finds a node in visibleIds, or
 * null if none. clusterOverride (real node id -> currently-visible cluster
 * pseudo-node id) is consulted at every step of the walk, not just the
 * starting id — a node several levels below a clustered container still
 * needs to resolve through it — and takes priority over the plain
 * visibleIds check, since a clustered-away node's real container isn't
 * visible either while its cluster list is showing.
 */
function nearestVisibleAncestor(
  model: ArchModel,
  id: string,
  visibleIds: Set<string>,
  clusterOverride?: Map<string, string>
): string | null {
  let current = findNode(model, id);
  while (current) {
    const overridden = clusterOverride?.get(current.id);
    if (overridden) return overridden;
    if (visibleIds.has(current.id)) return current.id;
    current = current.parentId ? findNode(model, current.parentId) : undefined;
  }
  return null;
}
```

Then change:

```ts
export function getRelationsForViewWithRollup(model: ArchModel, visibleIds: Set<string>): ArchRelation[] {
  const direct = getRelationsForView(model, visibleIds);
  const directIds = new Set(direct.map((r) => r.id));

  const groups = new Map<string, ArchRelation[]>();
  model.relations.forEach((r) => {
    if (directIds.has(r.id)) return;
    const src = nearestVisibleAncestor(model, r.source, visibleIds);
    const tgt = nearestVisibleAncestor(model, r.target, visibleIds);
    if (!src || !tgt || src === tgt) return;
```

to:

```ts
export function getRelationsForViewWithRollup(
  model: ArchModel,
  visibleIds: Set<string>,
  clusterOverride?: Map<string, string>
): ArchRelation[] {
  const direct = getRelationsForView(model, visibleIds);
  const directIds = new Set(direct.map((r) => r.id));

  const groups = new Map<string, ArchRelation[]>();
  model.relations.forEach((r) => {
    if (directIds.has(r.id)) return;
    const src = nearestVisibleAncestor(model, r.source, visibleIds, clusterOverride);
    const tgt = nearestVisibleAncestor(model, r.target, visibleIds, clusterOverride);
    if (!src || !tgt || src === tgt) return;
```

Also update the JSDoc comment directly above `getRelationsForViewWithRollup` (currently describing
only the parentId-based rollup) by appending one sentence:

```
 * An optional clusterOverride additionally resolves a real node straight to a
 * currently-visible cluster pseudo-node id, when its actual container isn't
 * visible but its bounded-context cluster is (see src/lib/clusters.ts).
 */
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run src/lib/model.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npx vitest run`
Expected: all `scripts/okf-scan/**` tests plus the new `src/lib/**` tests pass.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/model.ts src/lib/model.test.ts
git commit -m "feat(model): roll up relations between clustered siblings to their cluster ids"
```

---

## Task 4: `ArchitectureGraph.tsx` — cluster icon + Bounded-Context box fix

**Files:**
- Create: `public/aws-icons/cluster-group.svg`
- Modify: `src/components/ArchitectureGraph.tsx`

**Files (no automated tests — see Task 1's CLAUDE.md note: React components in this codebase are
verified manually, not unit tested).**

- [ ] **Step 1: Add the cluster icon asset**

Create `public/aws-icons/cluster-group.svg` (following the same 48×48, flat-color rounded-rect
background + simple white geometric stroke convention as the existing hand-authored
`ddd-*.svg`/`fe-*.svg` icons — three overlapping squares suggesting "a group of items"):

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="8" fill="#5a6b82"/>
  <rect x="10" y="10" width="16" height="16" rx="2" fill="none" stroke="#ffffff" stroke-width="2"/>
  <rect x="22" y="22" width="16" height="16" rx="2" fill="none" stroke="#ffffff" stroke-width="2"/>
</svg>
```

- [ ] **Step 2: Fix the Bounded-Context box overlay gate**

In `src/components/ArchitectureGraph.tsx`, find:

```ts
    // Bounded-context boxes are a linguistic grouping (from node.ddd.context),
    // computed independently of the AWS network groups above. Unlike AWS groups,
    // they are NOT gated to the "every visible node is a container" AWS view —
    // they render whenever any visible node has a ddd.context, including inside a
    // drilled-into container, since the okf-scan pipeline's organizer stage now
    // assigns ddd_context at the component level too (see
    // docs/superpowers/specs/2026-07-06-ddd-organizer-agent-design.md).
    const showBoundedContextBoxes = positions.some(({ node }) => node.ddd?.context);
```

Replace it with:

```ts
    // Bounded-context boxes are a linguistic grouping (from node.ddd.context),
    // computed independently of the AWS network groups above. Unlike AWS groups,
    // they are NOT gated to the "every visible node is a container" AWS view —
    // they render whenever the view has *at least 2 distinct* ddd.context values
    // among visible nodes, including inside a drilled-into container, since the
    // okf-scan pipeline's organizer stage now assigns ddd_context at the
    // component level too (see
    // docs/superpowers/specs/2026-07-06-ddd-organizer-agent-design.md).
    // Requiring >=2 (not just >=1) matters once bounded-context clustering
    // (src/lib/clusters.ts) is in play: drilling into one specific cluster means
    // every visible node shares that one context by definition, and a box with
    // nothing to contrast against would just outline the entire view, duplicating
    // the ViewHeader title for no reason — see
    // docs/superpowers/specs/2026-07-06-bounded-context-clusters-design.md.
    const distinctContexts = new Set(positions.map(({ node }) => node.ddd?.context).filter(Boolean));
    const showBoundedContextBoxes = distinctContexts.size >= 2;
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 4: Manual sanity check**

Run `npm run dev`, open `http://localhost:3000/?source=blog&parent=template-marketing-webapp-nextjs`,
and confirm the dashed "Bounded Context" boxes still render around each cluster's members when
multiple contexts are visible together (this container-level view won't actually show clusters
until Task 7 ships — this step is just confirming the `>=2` gate didn't break the existing,
already-shipped multi-context box rendering).

- [ ] **Step 5: Commit**

```bash
git add public/aws-icons/cluster-group.svg src/components/ArchitectureGraph.tsx
git commit -m "fix(graph): require 2+ distinct ddd_context values before drawing a Bounded Context box"
```

---

## Task 5: `Breadcrumb.tsx` — cluster segment

**Files:**
- Modify: `src/components/Breadcrumb.tsx`

- [ ] **Step 1: Add the new props and render the extra segment**

Replace the full contents of `src/components/Breadcrumb.tsx`:

```ts
import type { ArchNode } from "@/lib/types";

interface BreadcrumbProps {
  trail: ArchNode[];
  onNavigate: (id: string | null) => void;
  /** Display name of the active bounded-context cluster, if one is drilled into (e.g. "Navigation Content"). */
  activeClusterLabel?: string;
  /** Clears the active cluster, staying on the same parent container. */
  onNavigateCluster?: () => void;
}

export default function Breadcrumb({ trail, onNavigate, activeClusterLabel, onNavigateCluster }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb">
      <button onClick={() => onNavigate(null)}>Context</button>
      {trail.map((node) => (
        <span key={node.id}>
          <span className="breadcrumb-sep">/</span>
          <button onClick={() => onNavigate(node.id)}>{node.name}</button>
        </span>
      ))}
      {activeClusterLabel && (
        <span>
          <span className="breadcrumb-sep">/</span>
          <button onClick={() => onNavigateCluster?.()}>{activeClusterLabel}</button>
        </span>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors (the two new props are optional, so the existing call site in
`ArchVizApp.tsx` still compiles until Task 7 updates it).

- [ ] **Step 3: Commit**

```bash
git add src/components/Breadcrumb.tsx
git commit -m "feat(breadcrumb): support an extra segment for the active bounded-context cluster"
```

---

## Task 6: `DetailsPanel.tsx` + `SidePanel.tsx` — cluster summary

**Files:**
- Modify: `src/components/DetailsPanel.tsx`
- Modify: `src/components/SidePanel.tsx`

- [ ] **Step 1: Add a cluster-summary branch to `DetailsPanel`**

In `src/components/DetailsPanel.tsx`, change the top of the component from:

```ts
interface DetailsPanelProps {
  node: ArchNode | null;
}

/** Just the "Resource" tab's content — SidePanel owns the surrounding <aside>/tabs. */
export default function DetailsPanel({ node }: DetailsPanelProps) {
  if (!node) {
    return <p className="details-empty">Select a resource to see its configuration.</p>;
  }

  return (
    <>
      <h2>{node.name}</h2>
      <p className="details-meta">
        {node.level.toUpperCase()}
        {node.technology ? ` · ${node.technology}` : ""}
        {node.external ? " · external" : ""}
      </p>
      {node.description && <p>{node.description}</p>}

      {node.ddd && (
```

to:

```ts
interface DetailsPanelProps {
  node: ArchNode | null;
  /** Resolved member nodes, only set when `node` is a bounded-context cluster pseudo-node. */
  clusterMembers?: ArchNode[];
}

/** Just the "Resource" tab's content — SidePanel owns the surrounding <aside>/tabs. */
export default function DetailsPanel({ node, clusterMembers }: DetailsPanelProps) {
  if (!node) {
    return <p className="details-empty">Select a resource to see its configuration.</p>;
  }

  if (node.synthetic) {
    return (
      <>
        <h2>{node.name}</h2>
        <p className="details-meta">BOUNDED CONTEXT CLUSTER</p>
        <p>This is a collapsed group of {node.synthetic.memberIds.length} component(s). Double-click it on the diagram to see its members.</p>
        {clusterMembers && clusterMembers.length > 0 && (
          <>
            <h3>Members</h3>
            <ul className="details-links">
              {clusterMembers.map((member) => (
                <li key={member.id}>
                  {member.name}
                  {member.technology ? ` — ${member.technology}` : ""}
                </li>
              ))}
            </ul>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <h2>{node.name}</h2>
      <p className="details-meta">
        {node.level.toUpperCase()}
        {node.technology ? ` · ${node.technology}` : ""}
        {node.external ? " · external" : ""}
      </p>
      {node.description && <p>{node.description}</p>}

      {node.ddd && (
```

(Everything below the `{node.ddd && (` line stays exactly as it is today — this task only adds
the new early-return branch above it.)

- [ ] **Step 2: Thread `clusterMembers` through `SidePanel`**

In `src/components/SidePanel.tsx`, change:

```ts
interface SidePanelProps {
  node: ArchNode | null;
  wikiAvailable: boolean;
  wikiBasePath?: string;
  /** relative .md path to open, derived from whatever the diagram currently has in focus */
  wikiEntryPath: string;
  activeTab: SidePanelTab;
  onTabChange: (tab: SidePanelTab) => void;
}
```

to:

```ts
interface SidePanelProps {
  node: ArchNode | null;
  /** Resolved member nodes, only set when `node` is a bounded-context cluster pseudo-node. */
  clusterMembers?: ArchNode[];
  wikiAvailable: boolean;
  wikiBasePath?: string;
  /** relative .md path to open, derived from whatever the diagram currently has in focus */
  wikiEntryPath: string;
  activeTab: SidePanelTab;
  onTabChange: (tab: SidePanelTab) => void;
}
```

Then change the function signature and the `DetailsPanel` call:

```ts
export default function SidePanel({
  node,
  wikiAvailable,
  wikiBasePath,
  wikiEntryPath,
  activeTab,
  onTabChange,
}: SidePanelProps) {
```

to:

```ts
export default function SidePanel({
  node,
  clusterMembers,
  wikiAvailable,
  wikiBasePath,
  wikiEntryPath,
  activeTab,
  onTabChange,
}: SidePanelProps) {
```

and:

```ts
          <div className="details-panel">
            <DetailsPanel node={node} />
          </div>
```

to:

```ts
          <div className="details-panel">
            <DetailsPanel node={node} clusterMembers={clusterMembers} />
          </div>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors (both new props are optional; `ArchVizApp.tsx`'s existing `<SidePanel>`
call site still compiles until Task 7 updates it).

- [ ] **Step 4: Commit**

```bash
git add src/components/DetailsPanel.tsx src/components/SidePanel.tsx
git commit -m "feat(details-panel): render a member summary when the selected node is a cluster"
```

---

## Task 7: `ArchVizApp.tsx` — navigation wiring

**Files:**
- Modify: `src/components/ArchVizApp.tsx`

This is the integration task: deriving the effective cluster, swapping `visibleNodes` between the
cluster list and one cluster's real members, extending `isDrillable`/`handleDrillInto`, and
wiring the new `Breadcrumb`/`SidePanel` props from Tasks 5-6.

- [ ] **Step 1: Add the `computeClusterView` import**

Change:

```ts
import {
  findNode,
  getBreadcrumb,
  getChildren,
  getRelationsForViewWithRollup,
  hasChildren,
  tracePath,
} from "@/lib/model";
```

to:

```ts
import { computeClusterView, CLUSTER_ID_PREFIX } from "@/lib/clusters";
import {
  findNode,
  getBreadcrumb,
  getChildren,
  getRelationsForViewWithRollup,
  hasChildren,
  tracePath,
} from "@/lib/model";
```

- [ ] **Step 2: Reorder and extend the navigation-state block**

This step replaces a larger contiguous span than usual, because of a real bug tracing through the
existing code turns up: `selectedNodeId`'s current validation (`findNode(archModel, rawSelectedId)
? rawSelectedId : null`) only accepts ids present in `archModel.nodes`. A cluster pseudo-node id is
never in `archModel.nodes` (it's synthesized client-side), so single-clicking a cluster would set
`?node=__cluster__:...` in the URL, and this validation line would immediately discard it back to
`null` — silently breaking cluster selection entirely. Fixing this requires `clusterView` to exist
*before* `selectedNodeId` is validated, which means moving the `getChildren`/`computeClusterView`
calls earlier than they were, ahead of where `selectedNodeId` used to be computed.

Change this whole block:

```ts
  const currentParentId = archModel && rawParentId && findNode(archModel, rawParentId) ? rawParentId : null;
  const selectedNodeId = archModel && rawSelectedId && findNode(archModel, rawSelectedId) ? rawSelectedId : null;

  const visibleNodes = useMemo(
    () => (archModel ? getChildren(archModel, currentParentId) : []),
    [archModel, currentParentId]
  );
  const visibleRelations = useMemo(
    () => (archModel ? getRelationsForViewWithRollup(archModel, new Set(visibleNodes.map((n) => n.id))) : []),
    [archModel, visibleNodes]
  );
  const breadcrumbTrail = useMemo(
    () => (archModel ? getBreadcrumb(archModel, currentParentId) : []),
    [archModel, currentParentId]
  );
  const selectedNode = archModel && selectedNodeId ? findNode(archModel, selectedNodeId) ?? null : null;
```

to:

```ts
  const currentParentId = archModel && rawParentId && findNode(archModel, rawParentId) ? rawParentId : null;

  const rawChildren = useMemo(
    () => (archModel ? getChildren(archModel, currentParentId) : []),
    [archModel, currentParentId]
  );
  const clusterView = useMemo(() => computeClusterView(rawChildren), [rawChildren]);

  // A selected id is valid if it's either a real ArchNode or one of the current
  // view's synthetic cluster ids — the latter never appears in archModel.nodes,
  // so findNode alone would incorrectly invalidate a cluster selection.
  const selectedNodeId =
    archModel &&
    rawSelectedId &&
    (findNode(archModel, rawSelectedId) || clusterView?.clusterNodes.some((c) => c.id === rawSelectedId))
      ? rawSelectedId
      : null;

  // Explicit ?cluster= (set by double-clicking a cluster node) wins; otherwise fall
  // back to the selected node's own cluster membership, so a deep link straight to
  // ?node=<id> (e.g. from search) auto-expands the right cluster without needing its
  // own ?cluster= param — see the design doc's "Navigation model" section.
  const rawClusterParam = searchParams.get("cluster");
  const explicitClusterId =
    clusterView && rawClusterParam
      ? clusterView.clusterNodes.find((c) => c.id === `${CLUSTER_ID_PREFIX}${rawClusterParam}`)?.id
      : undefined;
  const selectedChildClusterId =
    clusterView && selectedNodeId ? clusterView.membershipByChildId.get(selectedNodeId) : undefined;
  const effectiveClusterId = explicitClusterId ?? selectedChildClusterId;

  const visibleNodes = useMemo(() => {
    if (!clusterView) return rawChildren;
    if (!effectiveClusterId) return clusterView.clusterNodes;
    return rawChildren.filter((c) => clusterView.membershipByChildId.get(c.id) === effectiveClusterId);
  }, [clusterView, rawChildren, effectiveClusterId]);

  const visibleRelations = useMemo(() => {
    if (!archModel) return [];
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    // Only pass the override while showing the cluster list itself (no single
    // cluster drilled into yet) — once inside one cluster, relations to a
    // sibling cluster's member are dropped, matching the existing
    // sibling-container behavior (see model.test.ts).
    const override = clusterView && !effectiveClusterId ? clusterView.membershipByChildId : undefined;
    return getRelationsForViewWithRollup(archModel, visibleIds, override);
  }, [archModel, visibleNodes, clusterView, effectiveClusterId]);

  const breadcrumbTrail = useMemo(
    () => (archModel ? getBreadcrumb(archModel, currentParentId) : []),
    [archModel, currentParentId]
  );
  const selectedNode =
    archModel && selectedNodeId
      ? findNode(archModel, selectedNodeId) ?? visibleNodes.find((n) => n.id === selectedNodeId) ?? null
      : null;
  const isSelectedNodeCluster = Boolean(selectedNode?.synthetic);
```

- [ ] **Step 3: Skip a cluster selection for Wiki-tab focus**

Change:

```ts
  const wikiFocusId = selectedNodeId ?? currentParentId;
  const wikiEntryPath = wikiFocusId ? `${wikiFocusId}.md` : "index.md";
```

to:

```ts
  const wikiFocusId = selectedNodeId && !isSelectedNodeCluster ? selectedNodeId : currentParentId;
  const wikiEntryPath = wikiFocusId ? `${wikiFocusId}.md` : "index.md";
```

- [ ] **Step 4: Extend `updateUrl` to support the `cluster` param**

Change:

```ts
  function updateUrl(
    patch: { source?: string; parent?: string | null; node?: string | null; panel?: SidePanelTab | null },
    push = false
  ) {
    const params = new URLSearchParams(searchParams.toString());
    if (patch.source !== undefined) params.set("source", patch.source);
    if (patch.parent !== undefined) {
      if (patch.parent === null) params.delete("parent");
      else params.set("parent", patch.parent);
    }
    if (patch.node !== undefined) {
      if (patch.node === null) params.delete("node");
      else params.set("node", patch.node);
    }
    if (patch.panel !== undefined) {
      if (patch.panel === null || patch.panel === "resource") params.delete("panel");
      else params.set("panel", patch.panel);
    }
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    (push ? router.push : router.replace)(url, { scroll: false });
  }
```

to:

```ts
  function updateUrl(
    patch: {
      source?: string;
      parent?: string | null;
      node?: string | null;
      panel?: SidePanelTab | null;
      cluster?: string | null;
    },
    push = false
  ) {
    const params = new URLSearchParams(searchParams.toString());
    if (patch.source !== undefined) params.set("source", patch.source);
    if (patch.parent !== undefined) {
      if (patch.parent === null) params.delete("parent");
      else params.set("parent", patch.parent);
    }
    if (patch.node !== undefined) {
      if (patch.node === null) params.delete("node");
      else params.set("node", patch.node);
    }
    if (patch.panel !== undefined) {
      if (patch.panel === null || patch.panel === "resource") params.delete("panel");
      else params.set("panel", patch.panel);
    }
    if (patch.cluster !== undefined) {
      if (patch.cluster === null) params.delete("cluster");
      else params.set("cluster", patch.cluster);
    }
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    (push ? router.push : router.replace)(url, { scroll: false });
  }
```

- [ ] **Step 5: Clear `cluster` on every navigation that changes or leaves the current parent**

Change:

```ts
  function handleSelectSource(id: string) {
    updateUrl({ source: id, parent: null, node: null, panel: null }, true);
  }

  function handleDrillInto(id: string) {
    updateUrl({ parent: id, node: null });
  }

  function handleNavigate(id: string | null) {
    updateUrl({ parent: id, node: null });
  }
```

to:

```ts
  function handleSelectSource(id: string) {
    updateUrl({ source: id, parent: null, node: null, panel: null, cluster: null }, true);
  }

  function handleDrillInto(id: string) {
    const target = visibleNodes.find((n) => n.id === id);
    if (target?.synthetic) {
      updateUrl({ cluster: id.slice(CLUSTER_ID_PREFIX.length), node: null });
      return;
    }
    updateUrl({ parent: id, node: null, cluster: null });
  }

  function handleNavigate(id: string | null) {
    updateUrl({ parent: id, node: null, cluster: null });
  }

  function handleNavigateCluster() {
    updateUrl({ cluster: null, node: null });
  }
```

- [ ] **Step 6: Pass the new props to `Breadcrumb` and `SidePanel`**

Change:

```ts
        <Breadcrumb trail={breadcrumbTrail} onNavigate={handleNavigate} />
```

to:

```ts
        <Breadcrumb
          trail={breadcrumbTrail}
          onNavigate={handleNavigate}
          activeClusterLabel={
            effectiveClusterId ? clusterView?.clusterNodes.find((c) => c.id === effectiveClusterId)?.name : undefined
          }
          onNavigateCluster={handleNavigateCluster}
        />
```

Change:

```ts
        <SidePanel
          node={selectedNode}
          wikiAvailable={Boolean(activeSource?.okfBasePath)}
          wikiBasePath={activeSource?.okfBasePath}
          wikiEntryPath={wikiEntryPath}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
```

to:

```ts
        <SidePanel
          node={selectedNode}
          clusterMembers={
            isSelectedNodeCluster && archModel
              ? selectedNode!.synthetic!.memberIds
                  .map((id) => findNode(archModel, id))
                  .filter((n): n is ArchNode => Boolean(n))
              : undefined
          }
          wikiAvailable={Boolean(activeSource?.okfBasePath) && !isSelectedNodeCluster}
          wikiBasePath={activeSource?.okfBasePath}
          wikiEntryPath={wikiEntryPath}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
```

- [ ] **Step 7: Extend `isDrillable` and the export filename**

Change:

```ts
                <ArchitectureGraph
                  nodes={visibleNodes}
                  relations={visibleRelations}
                  groups={archModel.groups ?? []}
                  boundary={archModel.boundary}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={handleSelectNode}
                  onDrillInto={handleDrillInto}
                  isDrillable={(id) => hasChildren(archModel, id)}
                  exportFileName={`${sourceId}-${currentParentId ?? "context"}`}
                  highlightedNodeIds={highlightedNodeIds}
                  highlightedRelationIds={highlightedRelationIds}
                />
```

to:

```ts
                <ArchitectureGraph
                  nodes={visibleNodes}
                  relations={visibleRelations}
                  groups={archModel.groups ?? []}
                  boundary={archModel.boundary}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={handleSelectNode}
                  onDrillInto={handleDrillInto}
                  isDrillable={(id) => {
                    const target = visibleNodes.find((n) => n.id === id);
                    if (target?.synthetic) return true;
                    return hasChildren(archModel, id);
                  }}
                  exportFileName={`${sourceId}-${currentParentId ?? "context"}${
                    effectiveClusterId ? `-${effectiveClusterId.slice(CLUSTER_ID_PREFIX.length)}` : ""
                  }`}
                  highlightedNodeIds={highlightedNodeIds}
                  highlightedRelationIds={highlightedRelationIds}
                />
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 9: Run the full test suite**

Run: `npx vitest run`
Expected: all tests still pass (this task doesn't add new unit tests — `ArchVizApp.tsx` is a
React component, verified manually per this codebase's established pattern, same as
`ArchitectureGraph.tsx`).

- [ ] **Step 10: Commit**

```bash
git add src/components/ArchVizApp.tsx
git commit -m "feat(nav): render bounded-context clusters by default, drilling in like a real container"
```

---

## Task 8: Manual browser verification

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server if it isn't already running**

```bash
npm run dev
```

- [ ] **Step 2: Open the container that was the original motivating case**

Navigate to `http://localhost:3000/?source=blog&parent=template-marketing-webapp-nextjs`.

- [ ] **Step 3: Confirm the cluster list renders instead of 76 flat nodes**

Click "Fit". Confirm the view now shows roughly two dozen cluster nodes (one per distinct
`ddd_context` from the earlier organizer run, e.g. "Navigation Content (6)", "Error Handling
(5)", plus an "Outros (1)" for `index.md`'s lone untagged concept if any), not 76 individual
component nodes.

- [ ] **Step 4: Drill into a cluster**

Double-click a cluster node (e.g. "Settings (2)"). Confirm the view switches to show only that
cluster's real member nodes, the URL gains a `cluster=Settings` param, and the breadcrumb now
reads `Context / Template Marketing Webapp Nextjs / Settings (2)`.

- [ ] **Step 5: Confirm no giant redundant Bounded-Context box appears while inside one cluster**

While still drilled into the single cluster from Step 4, confirm there is **no** dashed "Bounded
Context: Settings" box drawn around the whole view (this is the fix from Task 4 — every visible
node here shares one context, so the box would convey nothing).

- [ ] **Step 6: Navigate back via the cluster breadcrumb segment**

Click the "Settings (2)" breadcrumb segment. Confirm it returns to the full cluster-list view
(same as Step 3), and the URL's `cluster` param is gone while `parent` is unchanged.

- [ ] **Step 7: Confirm cluster selection shows a member summary**

Single-click (not double-click) a cluster node from the Step 3 view. Confirm the right-hand
"Resource" panel shows "BOUNDED CONTEXT CLUSTER" plus a list of member names, and the "Wiki" tab
becomes disabled while this selection is active.

- [ ] **Step 8: Confirm search auto-expands the right cluster**

Press Ctrl+K, search for a specific component known to be inside a cluster (e.g. "Settings
Form"), and select it. Confirm the view jumps directly to the "Settings" cluster's expanded
member view (not the cluster-list view) with that component selected — this is the derived
`selectedChildClusterId` fallback from Task 7, confirming search needed no code changes to work
correctly with clustering.

- [ ] **Step 9: Confirm an untagged dataset is unaffected**

Navigate to `http://localhost:3000/?source=order-system` (or any other data source with no
`ddd_context` data) and confirm containers still drill straight to their real children exactly as
before — no cluster list appears anywhere in this dataset.

- [ ] **Step 10: Report the outcome**

Summarize what the diagram looks like now vs. before (cluster count, whether drilling
in/out/breadcrumb/search all worked smoothly), and flag anything that looks visually off (e.g. a
cluster box overlapping oddly) so the user can decide whether further follow-up is needed.

---

## Task 9: Document the feature in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a new subsection after the existing "AWS network-boundary groups" section**

In `CLAUDE.md`, find the end of the "AWS network-boundary groups" section (right before the "AWS
visual style" heading), and insert a new subsection:

```markdown
### Bounded-context cluster navigation (`src/lib/clusters.ts`)

A container whose children have `ddd.context` set doesn't render all of them flat — `ArchVizApp`
derives a `ClusterView` (`computeClusterView` in `src/lib/clusters.ts`) that collapses each
distinct context into one synthetic, clickable `ArchNode` (id-prefixed `__cluster__:`, flagged via
`ArchNode.synthetic`), plus an "Outros" cluster for any untagged sibling. Double-clicking a
cluster behaves exactly like drilling into a real container (`ArchitectureGraph.tsx` needs no
special-casing for this — a cluster pseudo-node is just an ordinary drillable `ArchNode` to it),
setting a `?cluster=` URL param scoped to the current `?parent=`. The **effective** cluster shown
is that explicit param, or — if unset — whatever cluster the currently-selected node
(`?node=`) belongs to; this fallback is what lets search/deep-links to a specific tagged node work
with no special-casing at all, since `?node=<id>` alone resolves to the right expanded cluster on
every render. Relations between two different clusters of the same container roll up to edges
between the cluster ids via `getRelationsForViewWithRollup`'s optional `clusterOverride` parameter
(`src/lib/model.ts`) — scoped only to siblings of one container's cluster list, not a general
"always find some visible node" search; drilling into one specific cluster drops relations to a
sibling cluster's member, matching the pre-existing sibling-container rollup behavior. Selecting a
cluster (single click) shows a member-count summary in `DetailsPanel` instead of a real
`aws.properties` block, and disables the Wiki tab (no underlying markdown file for a synthetic
node). The existing "Bounded Context" box overlay (`computeBoundedContextBoxes`) requires **at
least 2** distinct `ddd.context` values among visible nodes to draw a box, not just 1 — otherwise
every single-cluster drill-in (where all visible nodes share one context by definition) would draw
a pointless box around the entire view.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document bounded-context cluster navigation"
```
