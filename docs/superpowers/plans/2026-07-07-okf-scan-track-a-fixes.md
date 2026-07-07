# OKF Scan Track A Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four proven, structural bugs/gaps in the `okf-scan` pipeline (`scripts/okf-scan/synthesize/`) — a bracket-titleizing bug that silently drops concepts from navigation, missing icons on every generated concept, a hardcoded root title, and a boundary default that disables the boundary box instead of labeling it — so every future scanned bundle gets this quality without manual intervention, the way `blog2` currently has it only by hand.

**Architecture:** Four independent, additive changes to `scripts/okf-scan/synthesize/markdown.ts` and `scripts/okf-scan/synthesize/synthesize.ts`, plus one new file (`frontend-icons.ts`). No new dependencies, no changes to `organize.ts`, `llm.ts`, or any scanner. This is Track A of `docs/superpowers/specs/2026-07-07-okf-scan-humanization-design.md` — Track B (materialization + actor inference + the review Skill) is a separate plan, deliberately not started here.

**Tech Stack:** TypeScript, Vitest (`npx vitest run <path>`), existing `parseFrontmatter`/`Frontmatter` from `src/lib/frontmatter.ts`.

---

### Task 1: Bracket-safe `titleize()`

**Files:**
- Modify: `scripts/okf-scan/synthesize/markdown.ts:6-10`
- Test: `scripts/okf-scan/synthesize/markdown.test.ts:6-11`

- [ ] **Step 1: Write the failing test**

Add to the existing `describe("titleize", ...)` block in `markdown.test.ts`:

```ts
  it("strips literal brackets from a Next.js dynamic route segment, so the title never breaks the markdown-link regex used elsewhere in the pipeline", () => {
    expect(titleize("app/[slug]")).toBe("Slug");
    expect(titleize("app/[...slug]")).toBe("Slug");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/okf-scan/synthesize/markdown.test.ts`
Expected: FAIL — `titleize("app/[slug]")` currently returns `"[Slug]"`, not `"Slug"`.

- [ ] **Step 3: Fix `titleize`**

Replace in `markdown.ts`:

```ts
export function titleize(id: string): string {
  const last = id.split("/").pop() ?? id;
  return last.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
```

with:

```ts
export function titleize(id: string): string {
  const last = id.split("/").pop() ?? id;
  const cleaned = last.replace(/^\.\.\./, "").replace(/[[\]]/g, "");
  return cleaned.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/okf-scan/synthesize/markdown.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/synthesize/markdown.ts scripts/okf-scan/synthesize/markdown.test.ts
git commit -m "fix(okf-scan): strip literal brackets in titleize so dynamic routes stay linkable"
```

---

### Task 2: `findFrontendIcon` — default icons for non-AWS concept types

**Files:**
- Create: `scripts/okf-scan/synthesize/frontend-icons.ts`
- Test: `scripts/okf-scan/synthesize/frontend-icons.test.ts`
- Modify: `scripts/okf-scan/synthesize/markdown.ts` (import + wire into `buildConceptMarkdown`)
- Test: `scripts/okf-scan/synthesize/markdown.test.ts` (extend `describe("buildConceptMarkdown", ...)`)

- [ ] **Step 1: Write the failing test for the new lookup**

Create `scripts/okf-scan/synthesize/frontend-icons.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { findFrontendIcon } from "./frontend-icons";

describe("findFrontendIcon", () => {
  it("resolves every known scanner-produced type to its icon file", () => {
    expect(findFrontendIcon("Next.js Page")).toBe("fe-screen.svg");
    expect(findFrontendIcon("React Route")).toBe("fe-screen.svg");
    expect(findFrontendIcon("Redux Slice")).toBe("fe-store.svg");
    expect(findFrontendIcon("Store")).toBe("fe-store.svg");
    expect(findFrontendIcon("API Client")).toBe("fe-service.svg");
    expect(findFrontendIcon("Service")).toBe("fe-service.svg");
    expect(findFrontendIcon("Design System Package")).toBe("fe-design-system.svg");
    expect(findFrontendIcon("UI Capability")).toBe("fe-design-system.svg");
    expect(findFrontendIcon("Custom Hook")).toBe("fe-hook.svg");
    expect(findFrontendIcon("React Hook")).toBe("fe-hook.svg");
    expect(findFrontendIcon("React Component")).toBe("fe-component.svg");
    expect(findFrontendIcon("Person")).toBe("user.svg");
    expect(findFrontendIcon("External System")).toBe("generic-application.svg");
  });

  it("returns undefined for an unrecognized type, so buildConceptMarkdown falls back to no icon rather than a wrong one", () => {
    expect(findFrontendIcon("Amazon DynamoDB Table")).toBeUndefined();
    expect(findFrontendIcon("Nonsense Type")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/okf-scan/synthesize/frontend-icons.test.ts`
Expected: FAIL — `Cannot find module './frontend-icons'`

- [ ] **Step 3: Create the lookup**

Create `scripts/okf-scan/synthesize/frontend-icons.ts`:

```ts
/**
 * Default icon for scanner-produced concept types that have no AWS
 * equivalent — src/lib/aws-icons.ts's findAwsIcon only matches official AWS
 * service names, so every non-AWS type the scanners emit today (React
 * components, Next.js routes, Redux stores, etc.) currently renders with no
 * icon at all. Exact match only, unlike findAwsIcon's fuzzy matching: the
 * scanners only ever emit this small, known set of literal type strings, so
 * no normalization is needed. Reuses the same fe-*.svg/user.svg/
 * generic-application.svg files already in public/aws-icons/ (see
 * CLAUDE.md's "AWS visual style" section) — no new icon files.
 */
const FRONTEND_ICON_BY_TYPE: Record<string, string> = {
  "Next.js Page": "fe-screen.svg",
  "React Route": "fe-screen.svg",
  "Redux Slice": "fe-store.svg",
  Store: "fe-store.svg",
  "API Client": "fe-service.svg",
  Service: "fe-service.svg",
  "Design System Package": "fe-design-system.svg",
  "UI Capability": "fe-design-system.svg",
  "Custom Hook": "fe-hook.svg",
  "React Hook": "fe-hook.svg",
  "React Component": "fe-component.svg",
  Person: "user.svg",
  "External System": "generic-application.svg",
};

export function findFrontendIcon(type: string): string | undefined {
  return FRONTEND_ICON_BY_TYPE[type];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/okf-scan/synthesize/frontend-icons.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for `buildConceptMarkdown` wiring**

Add to the existing `describe("buildConceptMarkdown", ...)` block in `markdown.test.ts` (after the last existing `it(...)`, before the closing `});`):

```ts
  it("sets a default icon for a non-AWS concept type when none is set explicitly", () => {
    const markdown = buildConceptMarkdown({
      facts: { id: "app/header", type: "React Component", level: "component", parentId: "app", sourceFiles: [] },
      prose: "Renders the header.",
      preserved: { links: [] },
      conceptTitles: {},
      groups: [],
    });
    const { data } = parseFrontmatter(markdown);
    expect(data.icon).toBe("fe-component.svg");
  });

  it("does not set icon for an AWS-typed concept, relying on the importer's own findAwsIcon fallback instead", () => {
    const markdown = buildConceptMarkdown({
      facts: {
        id: "orders_table",
        type: "Amazon DynamoDB Table",
        awsResourceType: "Amazon DynamoDB Table",
        level: "container",
        parentId: "platform",
        sourceFiles: [],
      },
      prose: "Stores orders.",
      preserved: { links: [] },
      conceptTitles: {},
      groups: [],
    });
    const { data } = parseFrontmatter(markdown);
    expect(data.icon).toBeUndefined();
  });
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run scripts/okf-scan/synthesize/markdown.test.ts`
Expected: FAIL — `data.icon` is `undefined` in the first new test (expected `"fe-component.svg"`).

- [ ] **Step 7: Wire `findFrontendIcon` into `buildConceptMarkdown`**

In `markdown.ts`, add the import:

```ts
import { findFrontendIcon } from "./frontend-icons";
```

Then change this block inside `buildConceptMarkdown`:

```ts
  if (facts.awsResourceType) frontmatter.aws_resource_type = facts.awsResourceType;
  if (facts.groupId) frontmatter.group = relativeGroupLink(facts.id, groups, facts.groupId);
```

to:

```ts
  if (facts.awsResourceType) {
    frontmatter.aws_resource_type = facts.awsResourceType;
  } else {
    const icon = findFrontendIcon(facts.type);
    if (icon) frontmatter.icon = icon;
  }
  if (facts.groupId) frontmatter.group = relativeGroupLink(facts.id, groups, facts.groupId);
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run scripts/okf-scan/synthesize/markdown.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add scripts/okf-scan/synthesize/frontend-icons.ts scripts/okf-scan/synthesize/frontend-icons.test.ts scripts/okf-scan/synthesize/markdown.ts scripts/okf-scan/synthesize/markdown.test.ts
git commit -m "feat(okf-scan): default icons for non-AWS concept types"
```

---

### Task 3: Preserve root `index.md` content across re-scans

**Files:**
- Modify: `scripts/okf-scan/synthesize/markdown.ts` (export `stringifyFrontmatter`, add `PreservedRootFile`/`readPreservedRoot`)
- Test: `scripts/okf-scan/synthesize/markdown.test.ts` (new `describe("readPreservedRoot", ...)`)

This task only adds the reusable pieces; Task 4 wires them into `writeRootFiles` and adds the boundary/title behavior itself. Splitting this way keeps each task's diff reviewable on its own.

- [ ] **Step 1: Write the failing test**

Add a new `describe` block to `markdown.test.ts`, right after the existing `describe("readPreserved", ...)` block:

```ts
describe("readPreservedRoot", () => {
  it("returns nothing when there is no existing root file", () => {
    expect(readPreservedRoot(null)).toEqual({});
  });

  it("extracts a hand-set title, description, and boundary_label/boundary_icon", () => {
    const existing = [
      "---",
      "title: Loja Web — Frontend",
      "description: SPA React.",
      "boundary_label: Browser — Loja Web (SPA)",
      "boundary_icon: generic-application.svg",
      "---",
      "",
      "# Concepts",
    ].join("\n");

    const preserved = readPreservedRoot(existing);
    expect(preserved.title).toBe("Loja Web — Frontend");
    expect(preserved.description).toBe("SPA React.");
    expect(preserved.boundaryLabel).toBe("Browser — Loja Web (SPA)");
    expect(preserved.boundaryIcon).toBe("generic-application.svg");
  });

  it("extracts boundary: false", () => {
    const existing = ["---", "title: Generated Architecture", "boundary: false", "---", ""].join("\n");
    expect(readPreservedRoot(existing).boundary).toBe(false);
  });

  it("treats an absent boundary field as undefined, not false", () => {
    const existing = ["---", "title: Generated Architecture", "---", ""].join("\n");
    expect(readPreservedRoot(existing).boundary).toBeUndefined();
  });
});
```

Add the matching import at the top of `markdown.test.ts`:

```ts
import { buildConceptMarkdown, groupBundlePath, readPreserved, readPreservedRoot, relativeLinkFromTo, titleize } from "./markdown";
```

(replacing the existing import line that lists the same functions minus `readPreservedRoot`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/okf-scan/synthesize/markdown.test.ts`
Expected: FAIL — `readPreservedRoot` is not exported from `./markdown`.

- [ ] **Step 3: Add `PreservedRootFile`/`readPreservedRoot`, export `stringifyFrontmatter`**

In `markdown.ts`, change:

```ts
function stringifyFrontmatter(data: Frontmatter): string {
```

to:

```ts
export function stringifyFrontmatter(data: Frontmatter): string {
```

Then add this new interface + function right after the existing `readPreserved` function:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/okf-scan/synthesize/markdown.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/synthesize/markdown.ts scripts/okf-scan/synthesize/markdown.test.ts
git commit -m "feat(okf-scan): add readPreservedRoot for bundle root index.md"
```

---

### Task 4: Wire preservation, a real title, and a boundary_label default into `writeRootFiles`

**Files:**
- Modify: `scripts/okf-scan/synthesize/synthesize.ts:299-334` (`writeRootFiles`, plus its imports)
- Test: `scripts/okf-scan/synthesize/synthesize.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these three tests to the `describe("synthesize", ...)` block in `synthesize.test.ts` (near the other `writeRootFiles`-adjacent tests):

```ts
  it("gives a frontend-only bundle a boundary_label instead of disabling the boundary box", async () => {
    const scanResult: ScanResult = {
      groups: [],
      lambdaEnvVarBindings: {},
      concepts: [{ id: "app", type: "Frontend Application", level: "context", parentId: null, sourceFiles: [] }],
    };
    const { client } = fakeLlm();
    await synthesize({ scanResult, bundleDir, llm: client });

    const index = await readFile(path.join(bundleDir, "index.md"), "utf-8");
    const { data } = parseFrontmatter(index);
    expect(data.boundary_label).toBe("Browser — App — Documentation");
    expect(data.boundary_icon).toBe("generic-application.svg");
    expect(data.boundary).toBeUndefined();
  });

  it("derives the root title from the single top-level concept instead of the generic placeholder", async () => {
    const scanResult: ScanResult = {
      groups: [],
      lambdaEnvVarBindings: {},
      concepts: [{ id: "app", type: "Frontend Application", level: "context", parentId: null, sourceFiles: [] }],
    };
    const { client } = fakeLlm();
    await synthesize({ scanResult, bundleDir, llm: client });

    const index = await readFile(path.join(bundleDir, "index.md"), "utf-8");
    const { data } = parseFrontmatter(index);
    expect(data.title).toBe("App — Documentation");
  });

  it("preserves a hand-edited root title and boundary_label across a re-run instead of overwriting them", async () => {
    const scanResult: ScanResult = {
      groups: [],
      lambdaEnvVarBindings: {},
      concepts: [{ id: "app", type: "Frontend Application", level: "context", parentId: null, sourceFiles: [] }],
    };
    const { client: llm1 } = fakeLlm();
    await synthesize({ scanResult, bundleDir, llm: llm1 });

    const before = await readFile(path.join(bundleDir, "index.md"), "utf-8");
    const edited = before
      .replace("title: App — Documentation", "title: Loja Web — Frontend")
      .replace(/boundary_label: .+/, "boundary_label: Custom Hand-Edited Label");
    await writeFile(path.join(bundleDir, "index.md"), edited);

    const { client: llm2 } = fakeLlm();
    await synthesize({ scanResult, bundleDir, llm: llm2 });

    const after = await readFile(path.join(bundleDir, "index.md"), "utf-8");
    const { data } = parseFrontmatter(after);
    expect(data.title).toBe("Loja Web — Frontend");
    expect(data.boundary_label).toBe("Custom Hand-Edited Label");
  });
```

Add the matching import at the top of `synthesize.test.ts` (it doesn't import `parseFrontmatter` today):

```ts
import { parseFrontmatter } from "../../../src/lib/frontmatter";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/okf-scan/synthesize/synthesize.test.ts`
Expected: FAIL — current output still has `title: "Generated Architecture"` and `boundary: false`.

- [ ] **Step 3: Rewrite `writeRootFiles`**

In `synthesize.ts`, update the import line:

```ts
import { buildConceptMarkdown, readPreserved, titleize, type ExistingConceptFile } from "./markdown";
```

to:

```ts
import {
  buildConceptMarkdown,
  readPreserved,
  readPreservedRoot,
  stringifyFrontmatter,
  titleize,
  type ExistingConceptFile,
} from "./markdown";
import type { Frontmatter } from "../../../src/lib/frontmatter";
```

Then replace the whole `writeRootFiles` function body from:

```ts
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

to:

```ts
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

  // A bundle with no platform/lambda children and no AWS network groups is a
  // pure frontend scan — it gets a labeled "Browser" boundary instead of the
  // default AWS Cloud box (see CLAUDE.md's "AWS visual style" section), unless
  // a human already curated something different (checked below via `preserved`).
  const isFrontendOnly = !hasPlatformChildren && scanResult.groups.length === 0;
  const existingIndexRaw = await readIfExists(path.join(bundleDir, "index.md"));
  const preserved = readPreservedRoot(existingIndexRaw);
  const defaultTitle =
    topLevel.length === 1 ? `${conceptTitles[topLevel[0].id]} — Documentation` : "Generated Architecture";
  const title = preserved.title ?? defaultTitle;

  const frontmatter: Frontmatter = { title };
  if (preserved.description) frontmatter.description = preserved.description;
  if (preserved.boundary === false) {
    frontmatter.boundary = false;
  } else if (preserved.boundaryLabel) {
    frontmatter.boundary_label = preserved.boundaryLabel;
    if (preserved.boundaryIcon) frontmatter.boundary_icon = preserved.boundaryIcon;
  } else if (isFrontendOnly) {
    frontmatter.boundary_label = `Browser — ${title}`;
    frontmatter.boundary_icon = "generic-application.svg";
  }

  const indexLines = [
    stringifyFrontmatter(frontmatter),
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

`readIfExists` is already defined earlier in this file (used for per-concept preservation) — no new helper needed, just this new call site.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/okf-scan/synthesize/synthesize.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full test suite to confirm nothing else broke**

Run: `npx vitest run`
Expected: PASS (all suites, including `scripts/okf-scan/**` and `src/lib/**`)

- [ ] **Step 6: Commit**

```bash
git add scripts/okf-scan/synthesize/synthesize.ts scripts/okf-scan/synthesize/synthesize.test.ts
git commit -m "feat(okf-scan): preserve root index.md content and default to a labeled boundary"
```

---

### Task 5: Type-check and lint

**Files:** none (verification only)

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors introduced by this plan's changes (pre-existing unrelated errors, if any, are out of scope — see the plan's Task 4 diff for the exact files this plan touches).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Commit if lint/type-check required any fixes**

```bash
git add -A
git commit -m "fix(okf-scan): address lint/type-check feedback"
```

(Skip this step entirely if Steps 1–2 required no changes.)

---

## Self-review notes (from writing this plan)

- **Spec coverage**: all four Track A items from the design doc (bracket-titleize bug,
  missing icons, root title, boundary default + preservation) each have a task above.
- **Not in this plan, by design**: `organize.ts`, `llm.ts`, `actors.ts`, the
  `--materialize` CLI flags, and the review Skill are all Track B — a separate plan,
  per the spec's own scope note.
- **Known accepted limitation**: the real-title derivation (Task 4) only improves the
  common single-top-level-concept case (the one every frontend-only scan hits). A
  bundle with multiple top-level concepts and no repo-map label plumbed through still
  falls back to the literal `"Generated Architecture"` placeholder — flagged in the
  design doc's Track A section as an accepted simplification, not silently dropped.
