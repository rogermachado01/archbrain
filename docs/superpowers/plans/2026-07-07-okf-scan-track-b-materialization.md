# OKF Scan Track B: Materialization + Actor Inference + Review Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `okf-scan` a reviewed, mechanical path to do what was done by hand for `blog2` — materializing a large flat container into named capability sub-containers, and inferring root-level Person/External-System actors — without ever silently reshaping a bundle's file tree. Ships as `--materialize=propose` (side-effect-free, writes a JSON proposal only) and `--materialize=apply --plan=<path>` (performs the actual transform), plus a new Claude Code Skill that walks a developer through reviewing a proposal before applying it.

**Architecture:** A new pure-function core (`scripts/okf-scan/synthesize/materialize.ts`) that rewrites `ConceptFacts` ids/`parentId`s and remaps every relation's `targetId` bundle-wide — performed *before* any markdown is written, so the existing `relativeLinkFromTo`/`buildRelationsSection`/`writeChildIndexes` machinery produces correct paths automatically (no regex-editing-already-written-markdown, which is what produced two real path bugs in the manual `blog2` pass). A new `ActorInferenceClient` (`scripts/okf-scan/synthesize/actors.ts`) mirrors the existing, already-shipped `OrganizerClient` (`organize.ts`) almost exactly. `synthesize()` itself changes minimally: a manifest-tracked one-shot skip set, and an optional list of container ids to record as newly materialized.

**Tech Stack:** TypeScript, Vitest, `@anthropic-ai/sdk` (mocked in tests, same pattern as `organize.test.ts`).

**Before starting:** this plan implements Track B of `docs/superpowers/specs/2026-07-07-okf-scan-humanization-design.md`. Track A (already shipped: bracket-safe titles, default icons, root-file preservation) is a prerequisite and is already on `main`. Two design refinements were made while writing this plan, based on empirically testing the trickiest logic before locking it into a plan (see Task 2/3's note, and Task 5/6's note on actor-relation direction) — both are called out inline below.

---

### Task 1: Manifest support for materialized containers

**Files:**
- Modify: `scripts/okf-scan/types.ts`
- Test: `scripts/okf-scan/manifest.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `manifest.test.ts`'s `describe("manifest", ...)` block:

```ts
  it("round-trips materializedContainers", async () => {
    const manifest: ScanManifest = {
      _repos: {},
      concepts: {},
      materializedContainers: {
        "app/shared-ui": { appliedAt: "2026-07-07T00:00:00.000Z" },
      },
    };
    await saveManifest(dir, manifest);
    const loaded = await loadManifest(dir);
    expect(loaded).toEqual(manifest);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/okf-scan/manifest.test.ts`
Expected: FAIL — TypeScript error, `materializedContainers` doesn't exist on `ScanManifest`.

- [ ] **Step 3: Add the field**

In `scripts/okf-scan/types.ts`, change:

```ts
export interface ScanManifest {
  _repos: Record<string, ManifestRepoEntry>;
  concepts: Record<string, ManifestConceptEntry>;
  /**
   * Cached from the last Terraform scan so the CLI can skip re-parsing
   * Terraform when its freshness check is unchanged, while a Lambda repo
   * that *did* change still has env-var bindings to resolve against.
   */
  lambdaEnvVarBindings?: Record<string, Record<string, string>>;
}
```

to:

```ts
export interface ScanManifest {
  _repos: Record<string, ManifestRepoEntry>;
  concepts: Record<string, ManifestConceptEntry>;
  /**
   * Cached from the last Terraform scan so the CLI can skip re-parsing
   * Terraform when its freshness check is unchanged, while a Lambda repo
   * that *did* change still has env-var bindings to resolve against.
   */
  lambdaEnvVarBindings?: Record<string, Record<string, string>>;
  /**
   * Container ids whose children have already been materialized into
   * capability sub-containers (see synthesize/materialize.ts). Once a
   * container id appears here, it's permanently skipped by both the
   * ddd_context organizer and the materializer on every future run — a
   * reviewed, one-time grouping decision is never silently re-shuffled by a
   * later scan.
   */
  materializedContainers?: Record<string, { appliedAt: string }>;
}
```

Also add `external?: boolean;` to `ConceptFacts` in this same file (small, unrelated-looking but needed by Task 4 below — doing it now keeps Task 4's diff focused on `markdown.ts` only):

```ts
export interface ConceptFacts {
  id: string;
  type: string;
  level: C4Level;
  parentId: string | null;
  awsResourceType?: string;
  schema?: Record<string, string | number | boolean>;
  relations?: FactRelation[];
  groupId?: string | null;
  owner?: string;
  sourceFiles: string[];
  needsReview?: string[];
  routePath?: string;
  usedByRoutes?: string[];
  /** Marks a Person/External-System actor concept synthesized by actor inference (see synthesize/actors.ts) — never set by a code/terraform scanner. */
  external?: boolean;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/okf-scan/manifest.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/types.ts scripts/okf-scan/manifest.test.ts
git commit -m "feat(okf-scan): add materializedContainers manifest field and ConceptFacts.external"
```

---

### Task 2: `computeMaterializationPlan` — pure planning function

**Files:**
- Create: `scripts/okf-scan/synthesize/materialize.ts`
- Test: `scripts/okf-scan/synthesize/materialize.test.ts`

**Important context for whoever implements this:** the logic below (including the single-member promotion rule and cross-group relation aggregation) was prototyped and empirically tested against 8 scenarios *before* being written into this plan, specifically because a first-draft version had a real bug (a promoted concept's `parentId` was set to its own new id instead of its actual new parent — caught by a test, not by inspection). The code below is the verified, corrected version. Implement it exactly as given; if you think you've found a bug in it, write a failing test proving it before changing anything.

- [ ] **Step 1: Write the failing tests**

Create `scripts/okf-scan/synthesize/materialize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ConceptFacts } from "../types";
import type { ContextAssignment } from "./organize";
import { computeMaterializationPlan } from "./materialize";

function component(id: string, context: string, relations?: ConceptFacts["relations"]): ConceptFacts {
  return { id, type: "React Component", level: "component", parentId: "app/shared-ui", relations, sourceFiles: [] };
}

describe("computeMaterializationPlan", () => {
  it("returns null when the container has fewer children than the materialize threshold", () => {
    const children = Array.from({ length: 5 }, (_, i) => component(`app/small/c${i}`, i < 2 ? "A" : "B"));
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 2 ? "A" : "B" }));
    expect(computeMaterializationPlan("app/small", children, assignments, children)).toBeNull();
  });

  it("returns null when the organizer produced only one distinct group", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, "Everything"));
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c) => (assignments[c.id] = { context: "Everything" }));
    expect(computeMaterializationPlan("app/shared-ui", children, assignments, children)).toBeNull();
  });

  it("groups children into capability sub-containers and remaps their ids", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));

    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children);
    expect(plan?.groups).toHaveLength(2);
    expect(plan?.idRemap["app/shared-ui/c0"]).toBe("app/shared-ui/navigation/c0");
    expect(plan?.idRemap["app/shared-ui/c8"]).toBe("app/shared-ui/content/c8");
  });

  it("promotes a single-member group referenced by 3+ other groups to a sibling of the container instead of wrapping it", () => {
    const children = Array.from({ length: 15 }, (_, i) => {
      if (i < 5) return component(`app/shared-ui/c${i}`, "A");
      if (i < 10) return component(`app/shared-ui/c${i}`, "B");
      if (i < 14) return component(`app/shared-ui/c${i}`, "C");
      return component(`app/shared-ui/c${i}`, "Theme");
    });
    children[0].relations = [{ targetId: "app/shared-ui/c14", evidence: "imports theme" }];
    children[5].relations = [{ targetId: "app/shared-ui/c14", evidence: "imports theme" }];
    children[10].relations = [{ targetId: "app/shared-ui/c14", evidence: "imports theme" }];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => {
      assignments[c.id] = { context: i < 5 ? "A" : i < 10 ? "B" : i < 14 ? "C" : "Theme" };
    });

    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children);
    const themeGroup = plan?.groups.find((g) => g.contextName === "Theme");
    expect(themeGroup?.promoted).toBe(true);
    expect(plan?.idRemap["app/shared-ui/c14"]).toBe("app/c14");
  });

  it("does not promote a single-member group with fewer than 3 external referrers", () => {
    const children = Array.from({ length: 15 }, (_, i) => {
      if (i < 5) return component(`app/shared-ui/c${i}`, "A");
      if (i < 10) return component(`app/shared-ui/c${i}`, "B");
      if (i < 14) return component(`app/shared-ui/c${i}`, "C");
      return component(`app/shared-ui/c${i}`, "Theme");
    });
    children[0].relations = [{ targetId: "app/shared-ui/c14", evidence: "imports theme" }];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => {
      assignments[c.id] = { context: i < 5 ? "A" : i < 10 ? "B" : i < 14 ? "C" : "Theme" };
    });

    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children);
    const themeGroup = plan?.groups.find((g) => g.contextName === "Theme");
    expect(themeGroup?.promoted).toBe(false);
    expect(plan?.idRemap["app/shared-ui/c14"]).toBe("app/shared-ui/theme/c14");
  });

  it("never promotes a single-member group in a top-level container (nowhere to promote to)", () => {
    const children = Array.from({ length: 15 }, (_, i) => {
      const id = `shared-ui/c${i}`;
      if (i < 5) return { ...component(id, "A"), parentId: "shared-ui" };
      if (i < 10) return { ...component(id, "B"), parentId: "shared-ui" };
      if (i < 14) return { ...component(id, "C"), parentId: "shared-ui" };
      return { ...component(id, "Theme"), parentId: "shared-ui" };
    });
    children[0].relations = [{ targetId: "shared-ui/c14", evidence: "x" }];
    children[5].relations = [{ targetId: "shared-ui/c14", evidence: "x" }];
    children[10].relations = [{ targetId: "shared-ui/c14", evidence: "x" }];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => {
      assignments[c.id] = { context: i < 5 ? "A" : i < 10 ? "B" : i < 14 ? "C" : "Theme" };
    });

    const plan = computeMaterializationPlan("shared-ui", children, assignments, children);
    expect(plan?.groups.find((g) => g.contextName === "Theme")?.promoted).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/okf-scan/synthesize/materialize.test.ts`
Expected: FAIL — `Cannot find module './materialize'`

- [ ] **Step 3: Create `materialize.ts` with `computeMaterializationPlan`**

Create `scripts/okf-scan/synthesize/materialize.ts`:

```ts
import type { ConceptFacts } from "../types";
import type { ContextAssignment } from "./organize";

/** Containers at or below this many children skip materialization entirely — deliberately higher than organize.ts's ORGANIZE_MIN_CHILDREN=9, since tagging is low-risk but restructuring the file tree is not. */
const MATERIALIZE_MIN_CHILDREN = 15;

/** A single-member group referenced by at least this many *other* groups is promoted to a sibling of the container instead of wrapped in its own one-file directory (the shared "theme" case). */
const PROMOTION_MIN_EXTERNAL_REFERRERS = 3;

export interface CapabilityGroup {
  /** New capability container id — or, when `promoted` is true, the concept's own new id (there is no separate wrapper container). */
  containerId: string;
  memberIds: string[];
  contextName: string;
  promoted: boolean;
}

export interface MaterializationPlan {
  containerId: string;
  groups: CapabilityGroup[];
  /** old concept id -> new concept id, for every renamed member across all groups */
  idRemap: Record<string, string>;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Decides whether a container's children should be materialized into real
 * capability sub-containers, and if so, how — pure planning, no file I/O.
 * Returns null when materialization doesn't apply (too few children, or the
 * organizer didn't produce at least 2 distinct groups — materializing into a
 * single group would be a no-op).
 */
export function computeMaterializationPlan(
  containerId: string,
  children: ConceptFacts[],
  assignments: Record<string, ContextAssignment>,
  allConcepts: ConceptFacts[],
): MaterializationPlan | null {
  if (children.length < MATERIALIZE_MIN_CHILDREN) return null;

  const idsByContext = new Map<string, string[]>();
  for (const child of children) {
    const context = assignments[child.id]?.context;
    if (!context) continue;
    idsByContext.set(context, [...(idsByContext.get(context) ?? []), child.id]);
  }
  if (idsByContext.size < 2) return null;

  const groupOfChildId = new Map<string, string>();
  idsByContext.forEach((ids, context) => ids.forEach((id) => groupOfChildId.set(id, context)));

  // For every child id, the set of *other groups* that have at least one
  // relation targeting it (cross-group only — same-group references don't
  // count toward "this is a shared dependency of the whole container").
  const referrerGroupsByTargetId = new Map<string, Set<string>>();
  for (const concept of allConcepts) {
    const sourceGroup = groupOfChildId.get(concept.id);
    for (const rel of concept.relations ?? []) {
      const targetGroup = groupOfChildId.get(rel.targetId);
      if (!targetGroup) continue;
      if (sourceGroup !== undefined && sourceGroup === targetGroup) continue;
      const set = referrerGroupsByTargetId.get(rel.targetId) ?? new Set<string>();
      set.add(sourceGroup ?? `__outside__:${concept.id}`);
      referrerGroupsByTargetId.set(rel.targetId, set);
    }
  }

  const parentOfContainer = containerId.includes("/") ? containerId.slice(0, containerId.lastIndexOf("/")) : null;
  const groups: CapabilityGroup[] = [];
  const idRemap: Record<string, string> = {};

  idsByContext.forEach((memberIds, contextName) => {
    if (memberIds.length === 1 && parentOfContainer !== null) {
      const soleId = memberIds[0];
      const referrerCount = referrerGroupsByTargetId.get(soleId)?.size ?? 0;
      if (referrerCount >= PROMOTION_MIN_EXTERNAL_REFERRERS) {
        const leafSegment = soleId.split("/").pop()!;
        const newId = `${parentOfContainer}/${leafSegment}`;
        groups.push({ containerId: newId, memberIds, contextName, promoted: true });
        idRemap[soleId] = newId;
        return;
      }
    }
    const slug = slugify(contextName);
    const newContainerId = `${containerId}/${slug}`;
    groups.push({ containerId: newContainerId, memberIds, contextName, promoted: false });
    for (const memberId of memberIds) {
      const leafSegment = memberId.split("/").pop()!;
      idRemap[memberId] = `${newContainerId}/${leafSegment}`;
    }
  });

  return { containerId, groups, idRemap };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/okf-scan/synthesize/materialize.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/synthesize/materialize.ts scripts/okf-scan/synthesize/materialize.test.ts
git commit -m "feat(okf-scan): add computeMaterializationPlan"
```

---

### Task 3: `applyMaterializationPlan` — pure transform function

**Files:**
- Modify: `scripts/okf-scan/synthesize/materialize.ts`
- Test: `scripts/okf-scan/synthesize/materialize.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `materialize.test.ts` (new `describe` block, and update the import line to include `applyMaterializationPlan`):

```ts
describe("applyMaterializationPlan", () => {
  it("rewrites member ids/parentIds and remaps their relation targetIds", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    children[0].relations = [{ targetId: "app/shared-ui/c8", evidence: "imports" }];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children)!;

    const result = applyMaterializationPlan(children, plan);
    const c0 = result.find((c) => c.id === "app/shared-ui/navigation/c0")!;
    expect(c0.parentId).toBe("app/shared-ui/navigation");
    expect(c0.relations?.[0].targetId).toBe("app/shared-ui/content/c8");
  });

  it("creates one new capability container per non-promoted group, parented under the original container", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children)!;

    const result = applyMaterializationPlan(children, plan);
    const navContainer = result.find((c) => c.id === "app/shared-ui/navigation")!;
    expect(navContainer.parentId).toBe("app/shared-ui");
    expect(navContainer.type).toBe("UI Capability");
    expect(navContainer.level).toBe("container");
  });

  it("aggregates cross-group relations onto the new capability containers, deduplicated by target group", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    children[0].relations = [{ targetId: "app/shared-ui/c8", evidence: "imports" }];
    children[1].relations = [{ targetId: "app/shared-ui/c9", evidence: "also imports" }];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children)!;

    const result = applyMaterializationPlan(children, plan);
    const navContainer = result.find((c) => c.id === "app/shared-ui/navigation")!;
    expect(navContainer.relations).toHaveLength(1);
    expect(navContainer.relations?.[0].targetId).toBe("app/shared-ui/content");
  });

  it("does not create a synthetic wrapper container for a promoted single-member group", () => {
    const children = Array.from({ length: 15 }, (_, i) => {
      if (i < 5) return component(`app/shared-ui/c${i}`, "A");
      if (i < 10) return component(`app/shared-ui/c${i}`, "B");
      if (i < 14) return component(`app/shared-ui/c${i}`, "C");
      return component(`app/shared-ui/c${i}`, "Theme");
    });
    children[0].relations = [{ targetId: "app/shared-ui/c14", evidence: "x" }];
    children[5].relations = [{ targetId: "app/shared-ui/c14", evidence: "x" }];
    children[10].relations = [{ targetId: "app/shared-ui/c14", evidence: "x" }];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => {
      assignments[c.id] = { context: i < 5 ? "A" : i < 10 ? "B" : i < 14 ? "C" : "Theme" };
    });
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children)!;

    const result = applyMaterializationPlan(children, plan);
    expect(result.find((c) => c.id === "app/shared-ui/theme")).toBeUndefined();
    const promoted = result.find((c) => c.id === "app/c14")!;
    expect(promoted.parentId).toBe("app");
  });

  it("remaps a relation from a concept outside the materialized container into a moved concept", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const outsideConcept: ConceptFacts = {
      id: "app/route",
      type: "Next.js Page",
      level: "container",
      parentId: "app",
      relations: [{ targetId: "app/shared-ui/c0", evidence: "renders" }],
      sourceFiles: [],
    };
    const allConcepts = [...children, outsideConcept];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, allConcepts)!;

    const result = applyMaterializationPlan(allConcepts, plan);
    const route = result.find((c) => c.id === "app/route")!;
    expect(route.relations?.[0].targetId).toBe("app/shared-ui/navigation/c0");
  });

  it("passes an unrelated concept through unchanged", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const unrelated: ConceptFacts = { id: "app/other-page", type: "Next.js Page", level: "container", parentId: "app", sourceFiles: [] };
    const allConcepts = [...children, unrelated];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, allConcepts)!;

    const result = applyMaterializationPlan(allConcepts, plan);
    expect(result.find((c) => c.id === "app/other-page")).toBe(unrelated);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/okf-scan/synthesize/materialize.test.ts`
Expected: FAIL — `applyMaterializationPlan` is not exported.

- [ ] **Step 3: Add `applyMaterializationPlan`**

First, update the existing top-of-file import to also bring in `FactRelation`:

```ts
import type { ConceptFacts, FactRelation } from "../types";
```

(replacing the `import type { ConceptFacts } from "../types";` line from Task 2 — don't add a second, separate import line for the same module.)

Then add to `materialize.ts` (below `computeMaterializationPlan`):

```ts
export function applyMaterializationPlan(allConcepts: ConceptFacts[], plan: MaterializationPlan): ConceptFacts[] {
  const memberToGroup = new Map<string, CapabilityGroup>();
  for (const group of plan.groups) {
    for (const memberId of group.memberIds) memberToGroup.set(memberId, group);
  }
  // Only meaningful for the promoted case: a promoted group's `containerId` IS
  // the concept's own new id (there's no separate wrapper container), so its
  // new parentId must be one level up from the *original* container being
  // materialized, not `group.containerId` itself. Conflating the two was a
  // real bug caught while testing this function (see Task 2's note above).
  const parentOfContainer = plan.containerId.includes("/")
    ? plan.containerId.slice(0, plan.containerId.lastIndexOf("/"))
    : null;

  const rewritten = allConcepts.map((concept) => {
    const newId = plan.idRemap[concept.id];
    const relations = concept.relations?.map((rel) => {
      const remapped = plan.idRemap[rel.targetId];
      return remapped ? { ...rel, targetId: remapped } : rel;
    });
    if (!newId) {
      return relations ? { ...concept, relations } : concept;
    }
    const group = memberToGroup.get(concept.id)!;
    const newParentId = group.promoted ? parentOfContainer! : group.containerId;
    return { ...concept, id: newId, parentId: newParentId, relations };
  });

  const rewrittenById = new Map(rewritten.map((c) => [c.id, c]));

  const newContainers: ConceptFacts[] = plan.groups
    .filter((g) => !g.promoted)
    .map((g) => {
      const seenTargetGroups = new Set<string>();
      const relations: FactRelation[] = [];
      for (const oldMemberId of g.memberIds) {
        const newMemberId = plan.idRemap[oldMemberId];
        const member = rewrittenById.get(newMemberId);
        for (const rel of member?.relations ?? []) {
          const targetGroup = plan.groups.find(
            (og) => og.containerId !== g.containerId && og.memberIds.some((m) => plan.idRemap[m] === rel.targetId),
          );
          if (!targetGroup || seenTargetGroups.has(targetGroup.containerId)) continue;
          seenTargetGroups.add(targetGroup.containerId);
          relations.push({ targetId: targetGroup.containerId, kind: rel.kind, evidence: rel.evidence });
        }
      }
      return {
        id: g.containerId,
        type: "UI Capability",
        level: "container" as const,
        parentId: plan.containerId,
        relations: relations.length > 0 ? relations : undefined,
        sourceFiles: [],
      };
    });

  return [...rewritten, ...newContainers];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/okf-scan/synthesize/materialize.test.ts`
Expected: PASS (12 tests total)

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/synthesize/materialize.ts scripts/okf-scan/synthesize/materialize.test.ts
git commit -m "feat(okf-scan): add applyMaterializationPlan"
```

---

### Task 4: `external` field wiring into `buildConceptMarkdown`

**Files:**
- Modify: `scripts/okf-scan/synthesize/markdown.ts`
- Test: `scripts/okf-scan/synthesize/markdown.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `markdown.test.ts`'s `describe("buildConceptMarkdown", ...)` block:

```ts
  it("sets external: true in frontmatter when facts.external is true", () => {
    const markdown = buildConceptMarkdown({
      facts: { id: "visitor", type: "Person", level: "context", parentId: null, external: true, sourceFiles: [] },
      prose: "A person using the site.",
      preserved: { links: [] },
      conceptTitles: {},
      groups: [],
    });
    const { data } = parseFrontmatter(markdown);
    expect(data.external).toBe(true);
  });

  it("omits external from frontmatter when facts.external is unset", () => {
    const markdown = buildConceptMarkdown({
      facts: { id: "app/header", type: "React Component", level: "component", parentId: "app", sourceFiles: [] },
      prose: "Renders the header.",
      preserved: { links: [] },
      conceptTitles: {},
      groups: [],
    });
    const { data } = parseFrontmatter(markdown);
    expect(data.external).toBeUndefined();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/okf-scan/synthesize/markdown.test.ts`
Expected: FAIL — `data.external` is `undefined` in the first new test (expected `true`).

- [ ] **Step 3: Wire it in**

In `markdown.ts`, inside `buildConceptMarkdown`, add right after the `level: facts.level,` line in the `frontmatter` object literal:

```ts
  const frontmatter: Frontmatter = {
    type: facts.type,
    title: titleize(facts.id),
    description: descriptionParagraph,
    level: facts.level,
  };
  if (typeof facts.external === "boolean") frontmatter.external = facts.external;
  if (facts.awsResourceType) {
```

(i.e. insert the new `if (typeof facts.external === "boolean") frontmatter.external = facts.external;` line between the closing `};` of the frontmatter literal and the existing `if (facts.awsResourceType) {` line — don't change anything else in that block.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/okf-scan/synthesize/markdown.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/synthesize/markdown.ts scripts/okf-scan/synthesize/markdown.test.ts
git commit -m "feat(okf-scan): emit external: true in frontmatter for actor concepts"
```

---

### Task 5: `ActorInferenceClient`

**Files:**
- Create: `scripts/okf-scan/synthesize/actors.ts`
- Test: `scripts/okf-scan/synthesize/actors.test.ts`

**Design note:** the LLM is only asked for a `type`/`title`/`description`/`relation_label`(+`kind`) per actor — deliberately *not* asked which concept it relates to. A first draft had the LLM also choose a `relates_to` target, symmetric for both actor types — but that gets the relation *direction* backwards for External System actors: in the hand-authored reference bundles (`webapp/customer.md` vs. `webapp/api-ecommerce.md`), a **Person** actor owns its own outgoing relation to the app, but an **External System** actor never has relations of its own — the *app* owns an outgoing relation to it instead (`webapp/webapp-system.md` → `api-ecommerce.md`/`cognito.md`/`analytics.md`). Since there's only ever one sensible relation target (the bundle's single root concept, if there is exactly one), the direction is derived in code by actor `type`, not asked of the model — this happens in Task 6, not here. This task only produces the type/title/description/relation label/kind.

- [ ] **Step 1: Write the failing tests**

Create `scripts/okf-scan/synthesize/actors.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConceptFacts } from "../types";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class FakeAPIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  class FakeAnthropic {
    messages = { create: createMock };
    static APIError = FakeAPIError;
  }
  return { default: FakeAnthropic };
});

const { createAnthropicActorInferenceClient } = await import("./actors");
const AnthropicModule = (await import("@anthropic-ai/sdk")).default as unknown as {
  APIError: new (status: number, message: string) => Error;
};

function concept(id: string, type = "React Component"): ConceptFacts {
  return { id, type, level: "container", parentId: null, sourceFiles: [] };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createAnthropicActorInferenceClient", () => {
  it("parses a well-formed multi-actor response", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: [
            "ACTORS:",
            "type=Person",
            "title=Visitor",
            "description=A person browsing the site.",
            "relation_label=Browses the site",
            "relation_kind=sync",
            "",
            "type=External System",
            "title=Contentful CMS",
            "description=Headless CMS providing page content.",
            "relation_label=Fetches content via GraphQL",
            "relation_kind=sync",
          ].join("\n"),
        },
      ],
      stop_reason: "end_turn",
    });

    const client = createAnthropicActorInferenceClient("fake-key");
    const result = await client.inferActors([concept("app")]);

    expect(result).toEqual([
      { type: "Person", title: "Visitor", description: "A person browsing the site.", relationLabel: "Browses the site", relationKind: "sync" },
      { type: "External System", title: "Contentful CMS", description: "Headless CMS providing page content.", relationLabel: "Fetches content via GraphQL", relationKind: "sync" },
    ]);
  });

  it("returns an empty array when the marker is present but no actor blocks follow", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: "ACTORS:" }], stop_reason: "end_turn" });

    const client = createAnthropicActorInferenceClient("fake-key");
    const result = await client.inferActors([concept("app")]);

    expect(result).toEqual([]);
  });

  it("drops a block missing a required field", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: ["ACTORS:", "type=Person", "title=Visitor", "relation_label=Browses the site"].join("\n"),
        },
      ],
      stop_reason: "end_turn",
    });

    const client = createAnthropicActorInferenceClient("fake-key");
    const result = await client.inferActors([concept("app")]);

    expect(result).toEqual([]);
  });

  it("caps at 3 actors even if more are returned", async () => {
    createMock.mockReset();
    const block = (title: string) =>
      [`type=Person`, `title=${title}`, `description=d`, `relation_label=uses`, `relation_kind=sync`].join("\n");
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: ["ACTORS:", block("A"), "", block("B"), "", block("C"), "", block("D")].join("\n") }],
      stop_reason: "end_turn",
    });

    const client = createAnthropicActorInferenceClient("fake-key");
    const result = await client.inferActors([concept("app")]);

    expect(result).toHaveLength(3);
  });

  it("returns an empty array without calling the API when there are no concepts", async () => {
    createMock.mockReset();
    const client = createAnthropicActorInferenceClient("fake-key");
    const result = await client.inferActors([]);

    expect(result).toEqual([]);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("retries once on a 429 rate-limit error and then succeeds", async () => {
    vi.useFakeTimers();
    createMock.mockReset();
    createMock
      .mockRejectedValueOnce(new AnthropicModule.APIError(429, "rate limited"))
      .mockResolvedValueOnce({
        content: [
          {
            type: "text",
            text: ["ACTORS:", "type=Person", "title=Visitor", "description=d", "relation_label=uses", "relation_kind=sync"].join("\n"),
          },
        ],
        stop_reason: "end_turn",
      });

    const client = createAnthropicActorInferenceClient("fake-key");
    const resultPromise = client.inferActors([concept("app")]);

    await vi.advanceTimersByTimeAsync(500);
    const result = await resultPromise;

    expect(result).toHaveLength(1);
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/okf-scan/synthesize/actors.test.ts`
Expected: FAIL — `Cannot find module './actors'`

- [ ] **Step 3: Create `actors.ts`**

Create `scripts/okf-scan/synthesize/actors.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { ConceptFacts, RelationKind } from "../types";

const MODEL = "claude-sonnet-5";
const MAX_ATTEMPTS = 3;
const MAX_TOKENS = 4096;
const MARKER = "ACTORS:";
const VALID_KINDS = new Set<RelationKind>(["sync", "async-event", "compensation"]);

export interface ActorProposal {
  type: "Person" | "External System";
  title: string;
  description: string;
  relationLabel: string;
  relationKind?: RelationKind;
}

export interface ActorInferenceClient {
  inferActors(concepts: ConceptFacts[]): Promise<ActorProposal[]>;
}

function buildPrompt(concepts: ConceptFacts[]): string {
  const lines = [
    "You are looking at every concept scanned from one software system, deciding whether its architecture diagram is missing any root-level actors: a human Person who uses the system, and/or an External System the code merely calls out to (an API client, an auth provider, a CMS) but that isn't itself part of what was scanned.",
    "Ground every proposal ONLY in evidence already present below — do not invent a persona or backend that isn't clearly implied by a concept's type, description, or relations. If the evidence is too thin to be confident, propose zero actors; do not force a guess.",
    `Concepts (${concepts.length}):`,
    ...concepts.map((c) => {
      const relSummary = c.relations?.length
        ? ` — relates to: ${c.relations.map((r) => r.targetId).join(", ")}`
        : "";
      return `- ${c.id} (${c.type})${relSummary}`;
    }),
    "",
    `For each actor you propose, output a block under a "${MARKER}" heading in exactly this format, one block per actor, separated by a blank line:`,
    "type=<Person|External System>",
    'title=<short display name, e.g. "Visitor" or "Contentful CMS">',
    "description=<one sentence, grounded only in the evidence above>",
    'relation_label=<short phrase for this actor\'s relationship to the system, e.g. "Browses the site" or "Fetches content via GraphQL">',
    "relation_kind=<sync|async-event|compensation, or leave blank for sync>",
    "If you find no confident evidence for any actor, output the heading with nothing after it. Propose at most 3 actors total. Output nothing else.",
  ];
  return lines.join("\n");
}

function parseActors(text: string): ActorProposal[] {
  const markerIndex = text.indexOf(MARKER);
  if (markerIndex === -1) return [];
  const body = text.slice(markerIndex + MARKER.length);
  const blocks = body
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const proposals: ActorProposal[] = [];
  for (const block of blocks) {
    const fields: Record<string, string> = {};
    for (const line of block.split("\n")) {
      const m = line.match(/^([a-z_]+)=(.*)$/);
      if (m) fields[m[1]] = m[2].trim();
    }
    const type = fields.type === "Person" || fields.type === "External System" ? fields.type : undefined;
    if (!type || !fields.title || !fields.description || !fields.relation_label) continue;
    const kind = fields.relation_kind as RelationKind | undefined;
    proposals.push({
      type,
      title: fields.title,
      description: fields.description,
      relationLabel: fields.relation_label,
      relationKind: kind && VALID_KINDS.has(kind) ? kind : undefined,
    });
  }
  return proposals.slice(0, 3);
}

export function createAnthropicActorInferenceClient(
  apiKey: string | undefined = process.env.ANTHROPIC_API_KEY,
): ActorInferenceClient {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required to infer root-level actors");
  const client = new Anthropic({ apiKey });

  return {
    async inferActors(concepts) {
      if (concepts.length === 0) return [];

      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const response = await client.messages.create({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            thinking: { type: "disabled" },
            messages: [{ role: "user", content: buildPrompt(concepts) }],
          });
          if (response.stop_reason === "max_tokens") {
            throw new Error("Actor inference response was truncated by max_tokens");
          }
          const textBlock = response.content.find((block) => block.type === "text");
          if (!textBlock || textBlock.type !== "text") throw new Error("Actor inference response had no text content");
          return parseActors(textBlock.text);
        } catch (err) {
          lastError = err;
          const isRateLimit = err instanceof Anthropic.APIError && err.status === 429;
          if (!isRateLimit || attempt === MAX_ATTEMPTS - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500));
        }
      }
      throw lastError;
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/okf-scan/synthesize/actors.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/synthesize/actors.ts scripts/okf-scan/synthesize/actors.test.ts
git commit -m "feat(okf-scan): add ActorInferenceClient"
```

---

### Task 6: Propose/apply orchestration + proposal file I/O

**Files:**
- Modify: `scripts/okf-scan/synthesize/materialize.ts`
- Test: `scripts/okf-scan/synthesize/materialize.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `materialize.test.ts` (update the import to add `applyMaterializationProposal`, `proposeMaterialization`, `writeProposal`, `readProposal`, `proposalPath`; add `import { mkdtemp, rm } from "node:fs/promises"; import { tmpdir } from "node:os"; import path from "node:path"; import { afterEach, beforeEach } from "vitest";` alongside the existing vitest imports; add `import type { ScanResult } from "../types";` and `import type { ActorProposal } from "./actors";`):

```ts
describe("applyMaterializationProposal", () => {
  it("wires a Person actor's own relation to the single root concept", () => {
    const root: ConceptFacts = { id: "app", type: "Frontend Application", level: "context", parentId: null, sourceFiles: [] };
    const scanResult: ScanResult = { concepts: [root], groups: [], lambdaEnvVarBindings: {} };
    const proposal = {
      containerPlans: [],
      actorProposals: [
        { type: "Person" as const, title: "Visitor", description: "d", relationLabel: "Browses the site", relationKind: "sync" as const },
      ],
    };

    const result = applyMaterializationProposal(scanResult, proposal);
    const visitor = result.concepts.find((c) => c.id === "visitor")!;
    expect(visitor.type).toBe("Person");
    expect(visitor.external).toBe(true);
    expect(visitor.relations).toEqual([{ targetId: "app", label: "Browses the site", kind: "sync", evidence: "Browses the site" }]);
  });

  it("wires an External System actor's relation onto the root concept instead of the actor itself", () => {
    const root: ConceptFacts = { id: "app", type: "Frontend Application", level: "context", parentId: null, sourceFiles: [] };
    const scanResult: ScanResult = { concepts: [root], groups: [], lambdaEnvVarBindings: {} };
    const proposal = {
      containerPlans: [],
      actorProposals: [
        { type: "External System" as const, title: "Contentful CMS", description: "d", relationLabel: "Fetches content via GraphQL", relationKind: "sync" as const },
      ],
    };

    const result = applyMaterializationProposal(scanResult, proposal);
    const cms = result.concepts.find((c) => c.id === "contentful-cms")!;
    expect(cms.relations).toBeUndefined();
    const rootAfter = result.concepts.find((c) => c.id === "app")!;
    expect(rootAfter.relations).toEqual([{ targetId: "contentful-cms", label: "Fetches content via GraphQL", kind: "sync", evidence: "Fetches content via GraphQL" }]);
  });

  it("skips wiring any relation when there isn't exactly one top-level concept", () => {
    const scanResult: ScanResult = {
      concepts: [
        { id: "a", type: "X", level: "context", parentId: null, sourceFiles: [] },
        { id: "b", type: "X", level: "context", parentId: null, sourceFiles: [] },
      ],
      groups: [],
      lambdaEnvVarBindings: {},
    };
    const proposal = {
      containerPlans: [],
      actorProposals: [{ type: "Person" as const, title: "Visitor", description: "d", relationLabel: "uses", relationKind: "sync" as const }],
    };

    const result = applyMaterializationProposal(scanResult, proposal);
    const visitor = result.concepts.find((c) => c.id === "visitor")!;
    expect(visitor.relations).toBeUndefined();
    expect(result.concepts.find((c) => c.id === "a")?.relations).toBeUndefined();
  });

  it("applies every container plan in the proposal", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const root: ConceptFacts = { id: "app", type: "Frontend Application", level: "context", parentId: null, sourceFiles: [] };
    const scanResult: ScanResult = { concepts: [root, ...children], groups: [], lambdaEnvVarBindings: {} };
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, [root, ...children])!;

    const result = applyMaterializationProposal(scanResult, { containerPlans: [plan], actorProposals: [] });
    expect(result.concepts.find((c) => c.id === "app/shared-ui/navigation/c0")).toBeDefined();
  });
});

describe("proposal file I/O", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "okf-scan-materialize-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips a proposal through writeProposal/readProposal", async () => {
    const proposal = {
      containerPlans: [],
      actorProposals: [{ type: "Person" as const, title: "Visitor", description: "d", relationLabel: "uses", relationKind: "sync" as const }] as ActorProposal[],
    };
    await writeProposal(dir, proposal);
    const loaded = await readProposal(dir);
    expect(loaded).toEqual(proposal);
  });
});

describe("proposeMaterialization", () => {
  it("skips a container id already in the alreadyMaterialized set", async () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, "Everything"));
    const scanResult: ScanResult = { concepts: children, groups: [], lambdaEnvVarBindings: {} };
    const organizeChildren = vi.fn().mockResolvedValue({});
    const inferActors = vi.fn().mockResolvedValue([]);

    const proposal = await proposeMaterialization(
      scanResult,
      { organizeChildren },
      { inferActors },
      new Set(["app/shared-ui"]),
    );

    expect(organizeChildren).not.toHaveBeenCalled();
    expect(proposal.containerPlans).toEqual([]);
  });

  it("calls the organizer for an eligible container and includes its plan when one is produced", async () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const scanResult: ScanResult = { concepts: children, groups: [], lambdaEnvVarBindings: {} };
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const organizeChildren = vi.fn().mockResolvedValue(assignments);
    const inferActors = vi.fn().mockResolvedValue([]);

    const proposal = await proposeMaterialization(scanResult, { organizeChildren }, { inferActors }, new Set());

    expect(organizeChildren).toHaveBeenCalledWith("app/shared-ui", children.map((c) => ({ facts: c })));
    expect(proposal.containerPlans).toHaveLength(1);
  });
});
```

Add `import { vi } from "vitest";` if not already present (it should already be imported for `describe/expect/it` — add `vi` to that same import).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/okf-scan/synthesize/materialize.test.ts`
Expected: FAIL — the new functions/exports don't exist yet.

- [ ] **Step 3: Add the orchestration functions**

First, update the existing top-of-file import to also bring in `ScanResult`:

```ts
import type { ConceptFacts, FactRelation, ScanResult } from "../types";
```

(replacing the `import type { ConceptFacts, FactRelation } from "../types";` line from Task 3 — don't add a second, separate import line for the same module.)

Then add these new import lines alongside it, at the top of `materialize.ts`:

```ts
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OrganizerClient } from "./organize";
import type { ActorInferenceClient, ActorProposal } from "./actors";
```

Then add, at the end of `materialize.ts`:

```ts
export interface MaterializationProposal {
  containerPlans: MaterializationPlan[];
  actorProposals: ActorProposal[];
}

const PROPOSAL_FILENAME = ".materialize-proposal.json";

export function proposalPath(bundleDir: string): string {
  return path.join(bundleDir, PROPOSAL_FILENAME);
}

function singleRootConceptId(concepts: ConceptFacts[]): string | null {
  const topLevel = concepts.filter((c) => c.parentId === null);
  return topLevel.length === 1 ? topLevel[0].id : null;
}

/**
 * Computes what materialization *would* do, without writing any concept
 * markdown or touching the manifest — the propose half of the review flow.
 */
export async function proposeMaterialization(
  scanResult: ScanResult,
  organizer: OrganizerClient,
  actorClient: ActorInferenceClient,
  alreadyMaterialized: Set<string>,
): Promise<MaterializationProposal> {
  const byParent = new Map<string, ConceptFacts[]>();
  for (const c of scanResult.concepts) {
    if (c.parentId === null || alreadyMaterialized.has(c.parentId)) continue;
    byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
  }

  const containerPlans: MaterializationPlan[] = [];
  for (const [containerId, children] of byParent) {
    if (children.length < MATERIALIZE_MIN_CHILDREN) continue;
    const assignments = await organizer.organizeChildren(
      containerId,
      children.map((c) => ({ facts: c })),
    );
    const plan = computeMaterializationPlan(containerId, children, assignments, scanResult.concepts);
    if (plan) containerPlans.push(plan);
  }

  const actorProposals = await actorClient.inferActors(scanResult.concepts);
  return { containerPlans, actorProposals };
}

/**
 * Applies a (possibly hand-edited) proposal to a ScanResult, producing a new
 * one with capability containers materialized and actor concepts added. Pure
 * — the caller is responsible for feeding the result into synthesize() to
 * actually write markdown.
 *
 * Relation direction for actors is decided here, by type, not by the LLM
 * (see actors.ts's design note): a Person actor gets its own outgoing
 * relation to the bundle's single root concept; an External System actor
 * gets no relations of its own — instead the root concept gains an outgoing
 * relation *to* it. Both only happen when the bundle has exactly one
 * top-level concept; otherwise the actor is still added, just unwired.
 */
export function applyMaterializationProposal(scanResult: ScanResult, proposal: MaterializationProposal): ScanResult {
  let concepts = scanResult.concepts;
  for (const plan of proposal.containerPlans) {
    concepts = applyMaterializationPlan(concepts, plan);
  }

  const rootId = singleRootConceptId(concepts);
  const actorConcepts: ConceptFacts[] = [];
  for (const actor of proposal.actorProposals) {
    const actorId = slugify(actor.title);
    if (actor.type === "Person") {
      actorConcepts.push({
        id: actorId,
        type: "Person",
        level: "context",
        parentId: null,
        external: true,
        relations: rootId
          ? [{ targetId: rootId, label: actor.relationLabel, kind: actor.relationKind, evidence: actor.relationLabel }]
          : undefined,
        sourceFiles: [],
      });
    } else {
      actorConcepts.push({
        id: actorId,
        type: "External System",
        level: "context",
        parentId: null,
        external: true,
        sourceFiles: [],
      });
      if (rootId) {
        concepts = concepts.map((c) =>
          c.id === rootId
            ? {
                ...c,
                relations: [
                  ...(c.relations ?? []),
                  { targetId: actorId, label: actor.relationLabel, kind: actor.relationKind, evidence: actor.relationLabel },
                ],
              }
            : c,
        );
      }
    }
  }

  return { ...scanResult, concepts: [...concepts, ...actorConcepts] };
}

export async function writeProposal(bundleDir: string, proposal: MaterializationProposal): Promise<void> {
  await writeFile(proposalPath(bundleDir), `${JSON.stringify(proposal, null, 2)}\n`, "utf-8");
}

export async function readProposal(bundleDir: string): Promise<MaterializationProposal> {
  const raw = await readFile(proposalPath(bundleDir), "utf-8");
  return JSON.parse(raw) as MaterializationProposal;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/okf-scan/synthesize/materialize.test.ts`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/synthesize/materialize.ts scripts/okf-scan/synthesize/materialize.test.ts
git commit -m "feat(okf-scan): add propose/apply materialization orchestration and proposal file I/O"
```

---

### Task 7: Wire the one-shot skip rule into `synthesize()`

**Files:**
- Modify: `scripts/okf-scan/synthesize/synthesize.ts`
- Test: `scripts/okf-scan/synthesize/synthesize.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `synthesize.test.ts`'s `describe("synthesize", ...)` block:

```ts
  it("skips organizing a container already recorded in manifest.materializedContainers", async () => {
    const children = Array.from({ length: 10 }, (_, i) => ({
      id: `app/shared-ui/c${i}`,
      type: "React Component",
      level: "component" as const,
      parentId: "app/shared-ui",
      sourceFiles: [],
    }));
    const scanResult: ScanResult = { groups: [], lambdaEnvVarBindings: {}, concepts: children };

    // Pre-seed a manifest recording "app/shared-ui" as already materialized.
    await mkdir(bundleDir, { recursive: true });
    await writeFile(
      path.join(bundleDir, ".scan-manifest.json"),
      JSON.stringify({ _repos: {}, concepts: {}, materializedContainers: { "app/shared-ui": { appliedAt: "2026-01-01T00:00:00.000Z" } } }),
    );

    const { client } = fakeLlm();
    const organizeChildren = vi.fn().mockResolvedValue({});
    await synthesize({ scanResult, bundleDir, llm: client, organizer: { organizeChildren } });

    expect(organizeChildren).not.toHaveBeenCalled();
  });

  it("records newlyMaterializedContainerIds into the manifest", async () => {
    const scanResult: ScanResult = {
      groups: [],
      lambdaEnvVarBindings: {},
      concepts: [{ id: "app", type: "Frontend Application", level: "context", parentId: null, sourceFiles: [] }],
    };
    const { client } = fakeLlm();
    await synthesize({ scanResult, bundleDir, llm: client, newlyMaterializedContainerIds: ["app/shared-ui"] });

    const manifestRaw = await readFile(path.join(bundleDir, ".scan-manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.materializedContainers["app/shared-ui"].appliedAt).toBeDefined();
  });
```

Add `vi` to the existing `import { afterEach, beforeEach, describe, expect, it } from "vitest";` line in `synthesize.test.ts` (becomes `import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/okf-scan/synthesize/synthesize.test.ts`
Expected: FAIL — first test fails because `organizeChildren` gets called anyway (no skip logic yet); second fails because `SynthesizeOptions` has no `newlyMaterializedContainerIds` field.

- [ ] **Step 3: Wire the skip rule and recording**

In `synthesize.ts`, update `SynthesizeOptions`:

```ts
export interface SynthesizeOptions {
  scanResult: ScanResult;
  bundleDir: string;
  llm: LlmClient;
  /** Assigns ddd_context/subdomain/role per container. Defaults to a no-op (no auto-assignment) when omitted, so existing callers/tests are unaffected. */
  organizer?: OrganizerClient;
  force?: boolean;
  /** max concurrent LLM prose calls; the rate-limit-bound stage, so this stays low by default */
  concurrency?: number;
  now?: () => string;
  /** Container ids that were just materialized this run (via materialize.ts's apply flow) — recorded into manifest.materializedContainers so neither the organizer nor the materializer ever re-analyzes them again. */
  newlyMaterializedContainerIds?: string[];
}
```

Update the options destructuring near the top of `synthesize()`:

```ts
  const {
    scanResult,
    bundleDir,
    llm,
    organizer = NOOP_ORGANIZER,
    force = false,
    concurrency = 6,
    now = () => new Date().toISOString(),
    newlyMaterializedContainerIds = [],
  } = options;
```

Update the `containersNeedingOrganizing` computation to exclude already-materialized parents:

```ts
  const regeneratingIds = new Set(toRegenerate.map((r) => r.facts.id));
  const materializedIds = new Set(Object.keys(manifest.materializedContainers ?? {}));
  const containersNeedingOrganizing = Array.from(childrenByParent.entries()).filter(
    ([parentId, children]) =>
      children.length >= ORGANIZE_MIN_CHILDREN &&
      children.some((c) => regeneratingIds.has(c.id)) &&
      !materializedIds.has(parentId),
  );
```

Right before the final `await saveManifest(bundleDir, manifest);` line, add:

```ts
  for (const id of newlyMaterializedContainerIds) {
    manifest.materializedContainers = { ...(manifest.materializedContainers ?? {}), [id]: { appliedAt: now() } };
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/okf-scan/synthesize/synthesize.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS except the one known, pre-existing, environment-caused `llm.test.ts` failure.

- [ ] **Step 6: Commit**

```bash
git add scripts/okf-scan/synthesize/synthesize.ts scripts/okf-scan/synthesize/synthesize.test.ts
git commit -m "feat(okf-scan): skip already-materialized containers in the organizer, record new ones"
```

---

### Task 8: CLI flags — `--materialize=propose|apply` and `--plan`

**Files:**
- Modify: `scripts/okf-scan/index.ts`
- Test: `scripts/okf-scan/index.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `index.test.ts`'s `describe("parseArgs", ...)` block:

```ts
  it("parses --materialize propose", () => {
    const args = parseArgs(["--repo-map", "repo-map.yaml", "--env", "dev", "--out", "out", "--materialize", "propose"]);
    expect(args.materialize).toBe("propose");
  });

  it("parses --materialize apply with --plan", () => {
    const args = parseArgs([
      "--repo-map", "repo-map.yaml", "--env", "dev", "--out", "out",
      "--materialize", "apply", "--plan", "out/.materialize-proposal.json",
    ]);
    expect(args.materialize).toBe("apply");
    expect(args.plan).toBe("out/.materialize-proposal.json");
  });

  it("rejects an invalid --materialize value", () => {
    expect(() =>
      parseArgs(["--repo-map", "repo-map.yaml", "--env", "dev", "--out", "out", "--materialize", "nonsense"]),
    ).toThrow(/propose, apply/);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/okf-scan/index.test.ts`
Expected: FAIL — `args.materialize`/`args.plan` are `undefined`; the invalid-value test doesn't throw.

- [ ] **Step 3: Add the flags to `parseArgs` and `CliArgs`**

In `index.ts`, update `CliArgs`:

```ts
export interface CliArgs {
  repoMap: string;
  env: Environment;
  out: string;
  force: boolean;
  concurrencyGit: number;
  concurrencyScan: number;
  concurrencyLlm: number;
  materialize?: "propose" | "apply";
  plan?: string;
}
```

Update `USAGE`:

```ts
const USAGE =
  "Usage: okf-scan --repo-map <path> --env <dev|hml|prd> --out <bundleDir> [--force] [--concurrency-git N] [--concurrency-scan N] [--concurrency-llm N] [--materialize propose|apply] [--plan <path>]";
```

Update `parseArgs`, right before the final `return`:

```ts
  const materializeRaw = get("--materialize");
  if (materializeRaw && materializeRaw !== "propose" && materializeRaw !== "apply") {
    throw new Error(`--materialize must be one of propose, apply (got "${materializeRaw}")`);
  }

  return {
    repoMap,
    env,
    out,
    force: argv.includes("--force"),
    concurrencyGit: Number(get("--concurrency-git") ?? 20),
    concurrencyScan: Number(get("--concurrency-scan") ?? 4),
    concurrencyLlm: Number(get("--concurrency-llm") ?? 6),
    materialize: materializeRaw as "propose" | "apply" | undefined,
    plan: get("--plan"),
  };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/okf-scan/index.test.ts`
Expected: PASS

- [ ] **Step 5: Wire `main()` to branch on `--materialize`**

In `index.ts`, add these imports at the top:

```ts
import { readFile } from "node:fs/promises";
import { createAnthropicActorInferenceClient } from "./synthesize/actors";
import { applyMaterializationProposal, proposeMaterialization, proposalPath, writeProposal, type MaterializationProposal } from "./synthesize/materialize";
```

In `main()`, right after the existing line `concepts = concepts.concat(lambdaConceptLists.flat(), frontendConceptLists.flat());` and before `const llm = createAnthropicLlmClient();`, insert:

```ts
  if (args.materialize === "propose") {
    const organizer = createAnthropicOrganizerClient();
    const actorClient = createAnthropicActorInferenceClient();
    const manifestForSkip = args.force ? emptyManifest() : await loadManifest(args.out);
    const alreadyMaterialized = new Set(Object.keys(manifestForSkip.materializedContainers ?? {}));
    const proposal = await proposeMaterialization(
      { concepts, groups, lambdaEnvVarBindings },
      organizer,
      actorClient,
      alreadyMaterialized,
    );
    await writeProposal(args.out, proposal);
    console.log(
      `okf-scan: wrote materialization proposal to ${proposalPath(args.out)} (${proposal.containerPlans.length} container plan(s), ${proposal.actorProposals.length} actor proposal(s))`,
    );
    return;
  }

  let newlyMaterializedContainerIds: string[] = [];
  if (args.materialize === "apply") {
    if (!args.plan) throw new Error("--materialize=apply requires --plan <path>");
    const proposalRaw = await readFile(args.plan, "utf-8");
    const proposal = JSON.parse(proposalRaw) as MaterializationProposal;
    const applied = applyMaterializationProposal({ concepts, groups, lambdaEnvVarBindings }, proposal);
    concepts = applied.concepts;
    newlyMaterializedContainerIds = proposal.containerPlans.map((p) => p.containerId);
  }
```

Then update the existing `synthesize(...)` call a few lines below to pass the new option through:

```ts
  const llm = createAnthropicLlmClient();
  const organizer = createAnthropicOrganizerClient();
  const summary = await synthesize({
    scanResult: { concepts, groups, lambdaEnvVarBindings },
    bundleDir: args.out,
    llm,
    organizer,
    force: args.force,
    concurrency: args.concurrencyLlm,
    newlyMaterializedContainerIds,
  });
```

(`concepts` is already declared with `let` earlier in `main()` — reassigning it in the apply branch above is fine; if it's currently declared with `const`, change that one declaration to `let`.)

- [ ] **Step 6: Manually verify the CLI wiring compiles and the propose path runs against a real bundle**

This step has no automated test (it requires a real `ANTHROPIC_API_KEY` and a real repo-map, which aren't available in CI) — verify manually:

Run: `npx tsc --noEmit -p .`
Expected: no new errors in `scripts/okf-scan/index.ts` or any file this task touched.

If you have a real `ANTHROPIC_API_KEY` and an existing repo-map available, optionally run:
```bash
npx tsx scripts/okf-scan/index.ts --repo-map <path> --env dev --out <existing-bundle-dir> --materialize propose
```
and confirm it writes `<existing-bundle-dir>/.materialize-proposal.json` without touching any `.md` file. If you don't have those available, skip this manual check and note it in your report — it will be covered by Task 9's end-to-end verification.

- [ ] **Step 7: Commit**

```bash
git add scripts/okf-scan/index.ts scripts/okf-scan/index.test.ts
git commit -m "feat(okf-scan): add --materialize propose|apply and --plan CLI flags"
```

---

### Task 9: The review Skill

**Files:**
- Create: `.claude/skills/okf-scan-humanize/SKILL.md`

This file has no automated tests (it's a Claude Code Skill — procedural instructions, not executable code) — verification is a careful read-through against the checklist in Step 2, not `vitest`.

- [ ] **Step 1: Create the Skill file**

Create `.claude/skills/okf-scan-humanize/SKILL.md`:

```markdown
---
name: okf-scan-humanize
description: "Use after running okf-scan on a repo whose bundle has large flat containers or is missing root-level actors (Person/External System). Reviews the pipeline's materialization + actor-inference proposal with the user one item at a time, then applies it. Never applies anything without walking through it first."
---

# okf-scan Humanize: Review and Apply a Materialization Proposal

This skill turns `okf-scan`'s automatic materialization/actor-inference *proposal*
into an applied, reviewed change — the same review discipline used when
`blog2` was reworked by hand, now repeatable for any future scanned bundle.

**Never apply a proposal without walking through every item in it with the
user first.** The organizer and actor-inference calls are LLM judgment calls
over a whole container/bundle at once — treat every proposed group name and
every proposed actor as a suggestion to confirm, not a fact.

## When to use this

- Right after a normal `okf-scan` run, when the summary output or a quick look
  at the bundle shows a container with a lot of flat children (a strong
  visual "wall of boxes" signal), or when the bundle's root `index.md` lists
  only the scanned system itself with no Person/External System actors.
- The user, or another skill/agent, explicitly asks to review/apply
  materialization for a bundle.

## Step 1: Generate the proposal

Ask for (or infer from context) the `--repo-map` path, `--env`, and the
bundle's `--out` directory (the same three flags a normal scan run used).
Run:

```bash
npx tsx scripts/okf-scan/index.ts --repo-map <repo-map-path> --env <env> --out <bundle-dir> --materialize propose
```

This only writes `<bundle-dir>/.materialize-proposal.json` — no `.md` file in
the bundle changes. Safe to re-run.

## Step 2: Read and summarize the proposal

Read `<bundle-dir>/.materialize-proposal.json`. For each entry in
`containerPlans`, summarize to the user: the container being split, how many
groups, each group's name and member count, and whether any group was
promoted (a `promoted: true` group means "this single component is being
pulled out to sit next to the container, because N other groups depend on
it" — explain this plainly, not just the JSON field name). For each entry in
`actorProposals`, summarize: proposed type (Person/External System), title,
description, and what relation it would get wired to the bundle's root
concept.

## Step 3: Walk through every item, one at a time

For each container plan and each actor proposal, ask the user (one question
per item, not a single "does this all look right?" bundled question):
accept as-is, rename (the group's `contextName`, or an actor's `title`),
merge two groups into one (update `containerPlans[i].groups` by hand,
merging `memberIds` arrays and removing the redundant group entry — note
this requires also updating `idRemap` entries for the merged-away group's
members to point at the surviving group's `containerId`), or drop the item
entirely (remove it from the array). Use whatever question-asking mechanism
your platform provides (e.g. `AskUserQuestion` in Claude Code) rather than a
single freeform "thoughts?" prompt — this mirrors exactly how the original
`blog2` capability split and actor inference were interactively confirmed.

Write the edited JSON back to the same file (or a copy — either is fine,
Step 4 takes an explicit path).

## Step 4: Apply

```bash
npx tsx scripts/okf-scan/index.ts --repo-map <repo-map-path> --env <env> --out <bundle-dir> --materialize apply --plan <bundle-dir>/.materialize-proposal.json
```

This performs the actual id/relation rewriting, regenerates every affected
concept's markdown (including fresh LLM-written prose/relation labels for
the new capability containers and actor concepts), and records every
materialized container id into the bundle's `.scan-manifest.json` so future
scans never re-analyze or re-shuffle this decision.

## Step 5: Verify before suggesting a commit

```bash
npm run validate
```

Report pass/fail to the user. If you can start the project's dev server
(see this repo's own `run` skill/command if one exists), offer to do so and
open the affected container in a browser so the user can eyeball the result
— the same manual verification loop used when `blog2` was built by hand.
Only after this passes, and only if the user asks, offer to `git add`/commit
the changed bundle files.

## What NOT to do

- Do not run `--materialize apply` without having walked through Step 3 with
  the user first, even if the proposal "looks obviously fine" to you.
- Do not hand-edit any generated `.md` file directly to work around a bad
  proposal — fix the proposal JSON and re-apply, so the manifest's
  materialized-container bookkeeping stays consistent with what's on disk.
- Do not re-run `--materialize propose` for a container that's already in
  `.scan-manifest.json`'s `materializedContainers` — the pipeline already
  skips it; if the grouping needs to change, that's a manual edit to the
  bundle's `.md`/`index.md` files directly (same as any other hand curation),
  not a re-materialization.
```

- [ ] **Step 2: Self-review checklist**

Read the file back and confirm:
- Frontmatter `name`/`description` match the format used by every other Skill referenced in this session (`name:` and `description:` only, no other frontmatter keys).
- Every command shown is copy-pasteable and matches the actual CLI flags added in Task 8 exactly (`--materialize propose`, `--materialize apply --plan <path>`).
- The "What NOT to do" section explicitly forbids the two failure modes this whole plan exists to prevent: applying without review, and silently hand-patching generated files out of sync with the manifest.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/okf-scan-humanize/SKILL.md
git commit -m "docs(okf-scan): add okf-scan-humanize review Skill"
```

---

### Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS except the one known, pre-existing, environment-caused `llm.test.ts` failure (`throws immediately when no API key is available`, caused by `ANTHROPIC_API_KEY` being set in the shell).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors in any file this plan touched (pre-existing, unrelated errors in the untracked `example/` directory are out of scope).

- [ ] **Step 3: Lint**

Run: `npx eslint scripts/okf-scan/`
Expected: clean.

- [ ] **Step 4: Validate that no existing bundle was affected**

Run: `npm run validate`
Expected: all registered data sources still pass — this plan only changes the generator, never touches `public/okf-bundles/**` directly.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(okf-scan): address lint/type-check feedback"
```

(Skip if Steps 1–4 required no changes.)

---

## Self-review notes (from writing this plan)

- **Spec coverage**: materialization mechanism (B1), actor inference (B2), and
  the review Skill from `docs/superpowers/specs/2026-07-07-okf-scan-humanization-design.md`
  Track B are all covered (Tasks 1–3 and 7 = B1; Tasks 4–6 = B2; Task 8–9 = CLI +
  Skill).
- **Two design corrections made while writing this plan, not just transcribed
  from the spec:**
  1. The promoted-concept `parentId` bug in `applyMaterializationPlan`
     (Task 3) — caught by writing and running a prototype with real test
     cases *before* locking the code into this plan, not by inspection.
  2. Actor relation direction (Task 5/6) — the design spec didn't specify
     which side of a Person/External-System relation owns it; tracing the
     hand-authored `webapp` bundle's actual convention (`customer.md` owns
     its relation to the app; `api-ecommerce.md`/`cognito.md`/`analytics.md`
     own none, the app owns relations *to* them instead) surfaced that a
     symmetric "LLM always picks the target" design would get External
     System actors backwards. Fixed by deriving direction from actor `type`
     in code instead of asking the model.
- **Known limitation, same as Track A's**: actor-relation wiring only
  applies when the bundle has exactly one top-level concept. A bundle with
  multiple top-level concepts still gets its proposed actors created, just
  without an auto-wired relation — a human wires it up by hand via the
  normal `# Relations` section, same as any hand-curated bundle content.
- **Not in this plan**: none — this plan implements Track B in full,
  including the promotion rule and cross-group relation synthesis the
  design spec called for (per explicit user decision to keep full scope
  rather than the simpler v1 alternative that was offered).
