# DDD Organizer Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an LLM-powered "organizer" stage to the `okf-scan` pipeline that assigns
`ddd_context`/`ddd_subdomain`/`ddd_role` to a container's children as a batch (so
siblings share a coherent taxonomy instead of each getting a random label), never
overriding hand-curated values — and relax the one rendering gate that currently
prevents the app's existing "Bounded Context" boxes from ever appearing at the
component level, so a large flat container (61 components today, in the real `blog`
bundle) breaks into labeled, readable clusters instead of one illegible wall of nodes.

**Architecture:** A new module, `scripts/okf-scan/synthesize/organize.ts`, exports an
`OrganizerClient` (same retry/backoff shape as the existing `LlmClient` in `llm.ts`,
but a distinct interface since its unit of work is "all of a container's children at
once," not one concept). `synthesize.ts` calls it once per container, merges its
output into each child's `preserved` object (only for fields with no hand-set value)
before calling the already-existing `buildConceptMarkdown` — no changes needed to
`markdown.ts` at all. `ArchitectureGraph.tsx` decouples bounded-context-box rendering
from the AWS-only view gate.

**Tech Stack:** TypeScript, `@anthropic-ai/sdk` (already a dependency), Vitest.

**Design doc:** `docs/superpowers/specs/2026-07-06-ddd-organizer-agent-design.md`

---

## Task 1: `organize.ts` — the organizer LLM client

**Files:**
- Create: `scripts/okf-scan/synthesize/organize.ts`
- Test: `scripts/okf-scan/synthesize/organize.test.ts`

- [ ] **Step 1: Write the failing tests**

`scripts/okf-scan/synthesize/organize.test.ts`:

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

const { createAnthropicOrganizerClient } = await import("./organize");
const AnthropicModule = (await import("@anthropic-ai/sdk")).default as unknown as {
  APIError: new (status: number, message: string) => Error;
};

function concept(id: string): ConceptFacts {
  return { id, type: "React Component", level: "component", parentId: "web-storefront", sourceFiles: [] };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createAnthropicOrganizerClient", () => {
  it("parses a well-formed multi-child response", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: [
            "CONTEXT ASSIGNMENTS:",
            "web-storefront/header: context=Navigation | subdomain=supporting | role=Presentational Component",
            "web-storefront/footer: context=Navigation | subdomain=supporting | role=Presentational Component",
          ].join("\n"),
        },
      ],
      stop_reason: "end_turn",
    });

    const client = createAnthropicOrganizerClient("fake-key");
    const result = await client.organizeChildren("web-storefront", [
      { facts: concept("web-storefront/header") },
      { facts: concept("web-storefront/footer") },
    ]);

    expect(result).toEqual({
      "web-storefront/header": { context: "Navigation", subdomain: "supporting", role: "Presentational Component" },
      "web-storefront/footer": { context: "Navigation", subdomain: "supporting", role: "Presentational Component" },
    });
  });

  it("omits a child whose line is missing from the response, without affecting the others", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: ["CONTEXT ASSIGNMENTS:", "web-storefront/header: context=Navigation | subdomain=supporting | role=Header"].join(
            "\n",
          ),
        },
      ],
      stop_reason: "end_turn",
    });

    const client = createAnthropicOrganizerClient("fake-key");
    const result = await client.organizeChildren("web-storefront", [
      { facts: concept("web-storefront/header") },
      { facts: concept("web-storefront/footer") },
    ]);

    expect(result).toEqual({
      "web-storefront/header": { context: "Navigation", subdomain: "supporting", role: "Header" },
    });
    expect(result["web-storefront/footer"]).toBeUndefined();
  });

  it("drops a subdomain value outside the core/supporting/generic enum, keeping context and role", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [
        { type: "text", text: ["CONTEXT ASSIGNMENTS:", "web-storefront/header: context=Navigation | subdomain=weird | role=Header"].join("\n") },
      ],
      stop_reason: "end_turn",
    });

    const client = createAnthropicOrganizerClient("fake-key");
    const result = await client.organizeChildren("web-storefront", [{ facts: concept("web-storefront/header") }]);

    expect(result).toEqual({ "web-storefront/header": { context: "Navigation", role: "Header" } });
  });

  it("includes an existingContext anchor in the prompt sent to the model", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: "CONTEXT ASSIGNMENTS:\nweb-storefront/header: context=Navigation | subdomain=supporting | role=Header",
        },
      ],
      stop_reason: "end_turn",
    });

    const client = createAnthropicOrganizerClient("fake-key");
    await client.organizeChildren("web-storefront", [
      { facts: concept("web-storefront/header"), existingContext: "Navigation" },
    ]);

    const sentPrompt = createMock.mock.calls[0][0].messages[0].content as string;
    expect(sentPrompt).toContain('already assigned to group "Navigation"');
  });

  it("returns an empty object without calling the API when there are no children", async () => {
    createMock.mockReset();
    const client = createAnthropicOrganizerClient("fake-key");
    const result = await client.organizeChildren("web-storefront", []);

    expect(result).toEqual({});
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
            text: "CONTEXT ASSIGNMENTS:\nweb-storefront/header: context=Navigation | subdomain=supporting | role=Header",
          },
        ],
        stop_reason: "end_turn",
      });

    const client = createAnthropicOrganizerClient("fake-key");
    const resultPromise = client.organizeChildren("web-storefront", [{ facts: concept("web-storefront/header") }]);

    await vi.advanceTimersByTimeAsync(500);
    const result = await resultPromise;

    expect(result).toEqual({ "web-storefront/header": { context: "Navigation", subdomain: "supporting", role: "Header" } });
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail because the module doesn't exist yet**

Run: `npx vitest run scripts/okf-scan/synthesize/organize.test.ts`
Expected: FAIL with `Cannot find module './organize'`.

- [ ] **Step 3: Implement `organize.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { ConceptFacts, DddSubdomain } from "../types";

const MODEL = "claude-sonnet-5";
const MAX_ATTEMPTS = 3;
const MARKER = "CONTEXT ASSIGNMENTS:";
const VALID_SUBDOMAINS = new Set<DddSubdomain>(["core", "supporting", "generic"]);

export interface ContextAssignment {
  context?: string;
  subdomain?: DddSubdomain;
  role?: string;
}

export interface OrganizerChild {
  facts: ConceptFacts;
  /**
   * A hand-curated ddd_context already set on this concept's existing file, if any —
   * passed to the model as a fixed anchor name to reuse for other children in the
   * same conceptual group, rather than inventing a second name for it.
   */
  existingContext?: string;
}

export interface OrganizerClient {
  organizeChildren(containerId: string, children: OrganizerChild[]): Promise<Record<string, ContextAssignment>>;
}

function buildPrompt(containerId: string, children: OrganizerChild[]): string {
  const lines = [
    "You are grouping the components of one software container into a small number of named, coherent conceptual groups (bounded contexts) for an architecture diagram — the goal is to make a large flat list of components easy for a human to scan by clustering related ones together.",
    `Container: ${containerId}`,
    `Components (${children.length}):`,
    ...children.map((c) => {
      const relSummary = c.facts.relations?.length
        ? ` — relates to: ${c.facts.relations.map((r) => r.targetId).join(", ")}`
        : "";
      const anchor = c.existingContext
        ? ` [already assigned to group "${c.existingContext}" — reuse this exact name if another component belongs in the same group]`
        : "";
      return `- ${c.facts.id} (${c.facts.type})${relSummary}${anchor}`;
    }),
    "",
    `For each component listed above, output one line under a "${MARKER}" heading in exactly this format:`,
    `<component id>: context=<short group name, 1-4 words, Title Case> | subdomain=<core|supporting|generic> | role=<short tactical role, e.g. "Presentational Component" or "Data Fetching Hook">`,
    'Reuse the exact same context name across every component that conceptually belongs together, including any component whose existing group name was given above. Use "core" for subdomains central to this app\'s own differentiating logic, "supporting" for necessary-but-not-differentiating pieces, and "generic" for purely technical/utility concerns. Output one line per component listed above, in the same order, and nothing else.',
  ];
  return lines.join("\n");
}

function parseAssignments(text: string, childIds: Set<string>): Record<string, ContextAssignment> {
  const markerIndex = text.indexOf(MARKER);
  if (markerIndex === -1) return {};
  const body = text.slice(markerIndex + MARKER.length);
  const result: Record<string, ContextAssignment> = {};
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([^\s:][^:]*):\s*(.+)$/);
    if (!match) continue;
    const [, id, rest] = match;
    if (!childIds.has(id)) continue;

    const assignment: ContextAssignment = {};
    const contextMatch = rest.match(/context=([^|]+)/);
    if (contextMatch) assignment.context = contextMatch[1].trim();
    const subdomainMatch = rest.match(/subdomain=([^|]+)/);
    const subdomain = subdomainMatch?.[1]?.trim() as DddSubdomain | undefined;
    if (subdomain && VALID_SUBDOMAINS.has(subdomain)) assignment.subdomain = subdomain;
    const roleMatch = rest.match(/role=(.+)$/);
    if (roleMatch) assignment.role = roleMatch[1].trim();

    if (Object.keys(assignment).length > 0) result[id] = assignment;
  }
  return result;
}

export function createAnthropicOrganizerClient(
  apiKey: string | undefined = process.env.ANTHROPIC_API_KEY
): OrganizerClient {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required to organize concepts into bounded contexts");
  const client = new Anthropic({ apiKey });

  return {
    async organizeChildren(containerId, children) {
      if (children.length === 0) return {};
      const childIds = new Set(children.map((c) => c.facts.id));

      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const response = await client.messages.create({
            model: MODEL,
            max_tokens: 2048,
            thinking: { type: "disabled" },
            messages: [{ role: "user", content: buildPrompt(containerId, children) }],
          });
          if (response.stop_reason === "max_tokens") {
            throw new Error("Organizer response was truncated by max_tokens");
          }
          const textBlock = response.content.find((block) => block.type === "text");
          if (!textBlock || textBlock.type !== "text") throw new Error("Organizer response had no text content");
          return parseAssignments(textBlock.text, childIds);
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

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run scripts/okf-scan/synthesize/organize.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/okf-scan/synthesize/organize.ts scripts/okf-scan/synthesize/organize.test.ts
git commit -m "feat(okf-scan): add LLM organizer client for ddd_context/subdomain/role assignment"
```

---

## Task 2: Wire the organizer into `synthesize.ts`

**Files:**
- Modify: `scripts/okf-scan/synthesize/synthesize.ts`
- Modify: `scripts/okf-scan/synthesize/synthesize.test.ts`

- [ ] **Step 1: Write the failing test**

In `scripts/okf-scan/synthesize/synthesize.test.ts`, add `mkdir` to the existing
`node:fs/promises` import (currently `import { mkdtemp, readFile, rm, writeFile } from
"node:fs/promises";`):

```ts
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
```

Add a new import for the organizer types, right after the existing `import type {
LlmClient } from "./llm";` line:

```ts
import type { ContextAssignment, OrganizerClient } from "./organize";
```

Add this test inside the `describe("synthesize", ...)` block:

```ts
  it("never overwrites a concept's hand-set ddd_context with the organizer's assignment, but fills it in for a sibling with none", async () => {
    const scanResult: ScanResult = {
      groups: [],
      lambdaEnvVarBindings: {},
      concepts: [
        { id: "orders", type: "AWS Lambda Function", level: "container", parentId: "platform", sourceFiles: [] },
        { id: "orders/handler", type: "AWS Lambda Handler", level: "component", parentId: "orders", sourceFiles: [] },
        { id: "orders/validator", type: "AWS Lambda Handler", level: "component", parentId: "orders", sourceFiles: [] },
      ],
    };

    // Pre-seed orders/handler.md with a hand-set ddd_context, as if a human already
    // curated it before this run.
    await mkdir(path.join(bundleDir, "orders"), { recursive: true });
    await writeFile(
      path.join(bundleDir, "orders", "handler.md"),
      ["---", "type: AWS Lambda Handler", "title: Handler", "ddd_context: Hand Curated Group", "---", "", "Old prose."].join(
        "\n",
      ),
    );

    const { client } = fakeLlm();
    const organizer: OrganizerClient = {
      async organizeChildren(containerId) {
        if (containerId !== "orders") return {};
        const assignments: Record<string, ContextAssignment> = {};
        for (const childId of ["orders/handler", "orders/validator"]) {
          assignments[childId] = { context: "LLM Suggested Group" };
        }
        return assignments;
      },
    };

    await synthesize({ scanResult, bundleDir, llm: client, organizer });

    const handlerContent = await readFile(path.join(bundleDir, "orders", "handler.md"), "utf-8");
    expect(handlerContent).toContain("ddd_context: Hand Curated Group");
    expect(handlerContent).not.toContain("LLM Suggested Group");

    const validatorContent = await readFile(path.join(bundleDir, "orders", "validator.md"), "utf-8");
    expect(validatorContent).toContain("ddd_context: LLM Suggested Group");
  });
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run scripts/okf-scan/synthesize/synthesize.test.ts`
Expected: FAIL — `synthesize()`'s options type doesn't accept `organizer` yet
(TypeScript/runtime error), and neither concept's file would show any `ddd_context` at
all yet either way.

- [ ] **Step 3: Implement the wiring in `synthesize.ts`**

Change the imports at the top of `scripts/okf-scan/synthesize/synthesize.ts` from:

```ts
import { buildConceptMarkdown, readPreserved, titleize } from "./markdown";
import type { LlmClient } from "./llm";
```

to:

```ts
import { buildConceptMarkdown, readPreserved, titleize, type ExistingConceptFile } from "./markdown";
import type { LlmClient } from "./llm";
import type { ContextAssignment, OrganizerClient } from "./organize";
```

Change the `SynthesizeOptions` interface from:

```ts
export interface SynthesizeOptions {
  scanResult: ScanResult;
  bundleDir: string;
  llm: LlmClient;
  force?: boolean;
  /** max concurrent LLM prose calls; the rate-limit-bound stage, so this stays low by default */
  concurrency?: number;
  now?: () => string;
}
```

to:

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
}
```

Change the options destructuring at the top of `synthesize()` from:

```ts
  const { scanResult, bundleDir, llm, force = false, concurrency = 6, now = () => new Date().toISOString() } = options;
```

to:

```ts
  const {
    scanResult,
    bundleDir,
    llm,
    organizer = { async organizeChildren() { return {}; } },
    force = false,
    concurrency = 6,
    now = () => new Date().toISOString(),
  } = options;
```

Right after the existing `toRegenerate`/`summary.skipped` loop (right after the closing
`}` of `for (const facts of scanResult.concepts) { ... }` that builds `toRegenerate`,
and before the `const regenerated = await mapWithConcurrency<...` line), insert:

```ts
  // Read every concept's currently-preserved ddd_* fields upfront (not just
  // regenerating ones) — the organizer needs a complete, container-by-container
  // sibling picture, including concepts that aren't changing this run, and any of
  // them might carry a hand-set ddd_context to anchor the organizer's naming
  // choices around.
  const preservedByConceptId = new Map<string, ExistingConceptFile>();
  for (const facts of scanResult.concepts) {
    preservedByConceptId.set(facts.id, readPreserved(await readIfExists(conceptFilePath(bundleDir, facts.id))));
  }

  const childrenByParent = new Map<string, ConceptFacts[]>();
  for (const facts of scanResult.concepts) {
    if (facts.parentId === null) continue;
    childrenByParent.set(facts.parentId, [...(childrenByParent.get(facts.parentId) ?? []), facts]);
  }

  // Only organize containers that actually have a regenerating child this run — an
  // organizer assignment is only ever consumed by a concept that's being (re)written
  // below, so calling the organizer for a container whose children are all unchanged
  // (and thus all skipped, byte-for-byte) would just be a wasted LLM call whose
  // output is never used.
  const regeneratingIds = new Set(toRegenerate.map((r) => r.facts.id));
  const containersNeedingOrganizing = Array.from(childrenByParent.entries()).filter(([, children]) =>
    children.some((c) => regeneratingIds.has(c.id)),
  );

  const organizedByConceptId = new Map<string, ContextAssignment>();
  await mapWithConcurrency(containersNeedingOrganizing, concurrency, async ([parentId, children]) => {
    try {
      const assignments = await organizer.organizeChildren(
        parentId,
        children.map((c) => ({ facts: c, existingContext: preservedByConceptId.get(c.id)?.ddd_context })),
      );
      for (const [childId, assignment] of Object.entries(assignments)) {
        organizedByConceptId.set(childId, assignment);
      }
    } catch {
      // Soft-degrade: this container's children simply get no auto-assignment this
      // run, same philosophy as the relation-label enrichment fallback — an
      // organizer hiccup for one container must never block synthesis for any
      // concept, in this container or any other.
    }
  });
```

Then, inside the existing per-concept `mapWithConcurrency` callback, change:

```ts
      try {
        const filePath = conceptFilePath(bundleDir, facts.id);
        const preserved = readPreserved(await readIfExists(filePath));
        const description = await llm.describeConcept(facts);
```

to:

```ts
      try {
        const filePath = conceptFilePath(bundleDir, facts.id);
        const preserved = preservedByConceptId.get(facts.id)!;
        const organized = organizedByConceptId.get(facts.id);
        const preservedWithOrganizer: ExistingConceptFile = {
          ...preserved,
          ddd_context: preserved.ddd_context ?? organized?.context,
          ddd_subdomain: preserved.ddd_subdomain ?? organized?.subdomain,
          ddd_role: preserved.ddd_role ?? organized?.role,
        };
        const description = await llm.describeConcept(facts);
```

And a few lines below that, change:

```ts
        const markdown = buildConceptMarkdown({
          facts: factsForMarkdown,
          prose: description.prose,
          preserved,
          conceptTitles,
          groups: scanResult.groups,
        });
```

to:

```ts
        const markdown = buildConceptMarkdown({
          facts: factsForMarkdown,
          prose: description.prose,
          preserved: preservedWithOrganizer,
          conceptTitles,
          groups: scanResult.groups,
        });
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run scripts/okf-scan/synthesize/synthesize.test.ts`
Expected: PASS (all tests, including the new one — check the exact count reported and
confirm no failures).

- [ ] **Step 5: Run the full okf-scan suite**

Run: `npx vitest run scripts/okf-scan`
Expected: PASS, except the pre-existing, unrelated `llm.test.ts` "throws immediately
when no API key is available" failure if `ANTHROPIC_API_KEY` happens to be set in the
shell environment — that failure predates this plan and isn't caused by it.

- [ ] **Step 6: Commit**

```bash
git add scripts/okf-scan/synthesize/synthesize.ts scripts/okf-scan/synthesize/synthesize.test.ts
git commit -m "feat(okf-scan): wire the organizer into synthesize, preserving hand-curated ddd_context"
```

---

## Task 3: Wire the real organizer client into the CLI

**Files:**
- Modify: `scripts/okf-scan/index.ts`

- [ ] **Step 1: Add the import**

Change:

```ts
import { createAnthropicLlmClient } from "./synthesize/llm";
import { synthesize } from "./synthesize/synthesize";
```

to:

```ts
import { createAnthropicLlmClient } from "./synthesize/llm";
import { createAnthropicOrganizerClient } from "./synthesize/organize";
import { synthesize } from "./synthesize/synthesize";
```

- [ ] **Step 2: Construct and pass the organizer**

Change:

```ts
  const llm = createAnthropicLlmClient();
  const summary = await synthesize({
    scanResult: { concepts, groups, lambdaEnvVarBindings },
    bundleDir: args.out,
    llm,
    force: args.force,
    concurrency: args.concurrencyLlm,
  });
```

to:

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
  });
```

- [ ] **Step 3: Verify the CLI still type-checks and the full test suite still passes**

Run: `npx tsc --noEmit -p .`
Expected: no new errors (any pre-existing errors are confined to the untracked
`example/` directory, unrelated to this change).

Run: `npx vitest run scripts/okf-scan`
Expected: PASS, same pre-existing unrelated `llm.test.ts` exception as before.

- [ ] **Step 4: Commit**

```bash
git add scripts/okf-scan/index.ts
git commit -m "feat(okf-scan): use the real organizer client in the CLI entrypoint"
```

---

## Task 4: Render bounded-context boxes at the component level

**Files:**
- Modify: `src/components/ArchitectureGraph.tsx`

Today, bounded-context box computation AND rendering both live entirely inside a
block gated by `isAwsBoundaryView` (true only when every visible node is
`level: "container"`) — so they never appear at the component level, which is exactly
the view this whole feature targets. This task decouples both the computation and the
actual cell-creation from that gate, while leaving the AWS boundary box and AWS network
groups (`groupBoxes`) exactly as gated as they are today.

- [ ] **Step 1: Replace the boundary/group/bounded-context setup block**

In `src/components/ArchitectureGraph.tsx`, find this exact block (it starts right after
the `maxDetourY` computation and ends right before the pre-existing `groupBoxes.forEach`
line):

```ts
    const boundaryConfig =
      boundary === false
        ? null
        : { label: boundary?.label ?? DEFAULT_BOUNDARY_LABEL, icon: boundary?.icon ?? DEFAULT_BOUNDARY_ICON };

    // A view is "inside AWS" once every visible node is a container-level AWS resource.
    const isAwsBoundaryView =
      boundaryConfig !== null && positions.length > 0 && positions.every(({ node }) => node.level === "container");
    const groupBoxes = isAwsBoundaryView
      ? computeGroupBoxes(nodes, positions, groups, {
          nodeWidth: NODE_WIDTH,
          nodeHeight: NODE_HEIGHT,
          padding: GROUP_BOX_PADDING,
          labelBand: GROUP_BOX_LABEL_BAND,
        })
      : [];
    // Bounded-context boxes are a linguistic grouping (from node.ddd.context),
    // computed independently of the AWS network groups above and gated the
    // same way — they can overlap AWS group boxes (see BC_BOX_PADDING comment).
    const bcBoxes = isAwsBoundaryView
      ? computeBoundedContextBoxes(nodes, positions, {
          nodeWidth: NODE_WIDTH,
          nodeHeight: NODE_HEIGHT,
          padding: BC_BOX_PADDING,
          labelBand: BC_BOX_LABEL_BAND,
        })
      : [];

    if (isAwsBoundaryView && boundaryConfig) {
      const minX = Math.min(...positions.map((p) => p.x), ...groupBoxes.map((b) => b.x), ...bcBoxes.map((b) => b.x));
      const minY = Math.min(...positions.map((p) => p.y), ...groupBoxes.map((b) => b.y), ...bcBoxes.map((b) => b.y));
      const maxX = Math.max(
        ...positions.map((p) => p.x + NODE_WIDTH),
        ...groupBoxes.map((b) => b.x + b.width),
        ...bcBoxes.map((b) => b.x + b.width)
      );
      const boundaryMaxY = Math.max(
        maxDetourY,
        ...groupBoxes.map((b) => b.y + b.height),
        ...bcBoxes.map((b) => b.y + b.height)
      );

      // zIndex is derived from the deepest AWS group present so the boundary
      // always stays furthest back, however many nesting levels a dataset
      // defines; with no groups (groupBoxes empty), this reduces to a fixed
      // depth. Bounded-context boxes sit one level in front of the boundary
      // but behind every AWS network group, since they're a coarser,
      // independent grouping — not part of the region/vpc/az/subnet nesting.
      const maxGroupDepth = groupBoxes.length > 0 ? Math.max(...groupBoxes.map((b) => b.depth)) : -1;

      cells.push(
        graph.createNode({
          id: BOUNDARY_ID,
          shape: "arch-boundary",
          x: minX - BOUNDARY_PADDING,
          y: minY - BOUNDARY_PADDING,
          width: maxX - minX + BOUNDARY_PADDING * 2,
          height: boundaryMaxY - minY + BOUNDARY_PADDING * 2,
          zIndex: -(maxGroupDepth + 3),
          attrs: {
            icon: { "xlink:href": `/aws-icons/${boundaryConfig.icon}` },
            label: { text: boundaryConfig.label },
          },
        })
      );

      bcBoxes.forEach((box) => {
        cells.push(
          graph.createNode({
            id: box.group.id,
            shape: "arch-group",
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            zIndex: -(maxGroupDepth + 2),
            attrs: {
              body: { stroke: BC_STYLE.stroke, strokeDasharray: BC_STYLE.dash },
              icon: { display: "none" },
              label: {
                refX: 12,
                fill: BC_STYLE.stroke,
                text: `Bounded Context: ${box.group.name}`,
              },
            },
          })
        );
      });

      groupBoxes.forEach((box) => {
```

Replace it with:

```ts
    const boundaryConfig =
      boundary === false
        ? null
        : { label: boundary?.label ?? DEFAULT_BOUNDARY_LABEL, icon: boundary?.icon ?? DEFAULT_BOUNDARY_ICON };

    // A view is "inside AWS" once every visible node is a container-level AWS resource.
    const isAwsBoundaryView =
      boundaryConfig !== null && positions.length > 0 && positions.every(({ node }) => node.level === "container");
    const groupBoxes = isAwsBoundaryView
      ? computeGroupBoxes(nodes, positions, groups, {
          nodeWidth: NODE_WIDTH,
          nodeHeight: NODE_HEIGHT,
          padding: GROUP_BOX_PADDING,
          labelBand: GROUP_BOX_LABEL_BAND,
        })
      : [];
    // Bounded-context boxes are a linguistic grouping (from node.ddd.context),
    // computed independently of the AWS network groups above. Unlike AWS groups,
    // they are NOT gated to the "every visible node is a container" AWS view —
    // they render whenever any visible node has a ddd.context, including inside a
    // drilled-into container, since the okf-scan pipeline's organizer stage now
    // assigns ddd_context at the component level too (see
    // docs/superpowers/specs/2026-07-06-ddd-organizer-agent-design.md).
    const showBoundedContextBoxes = positions.some(({ node }) => node.ddd?.context);
    const bcBoxes = showBoundedContextBoxes
      ? computeBoundedContextBoxes(nodes, positions, {
          nodeWidth: NODE_WIDTH,
          nodeHeight: NODE_HEIGHT,
          padding: BC_BOX_PADDING,
          labelBand: BC_BOX_LABEL_BAND,
        })
      : [];
    // zIndex is derived from the deepest AWS group present so bounded-context boxes
    // and the AWS boundary always stay behind every AWS network group, however many
    // nesting levels a dataset defines; with no groups (groupBoxes empty — always
    // true outside an AWS boundary view), this reduces to a fixed depth.
    const maxGroupDepth = groupBoxes.length > 0 ? Math.max(...groupBoxes.map((b) => b.depth)) : -1;

    if (isAwsBoundaryView && boundaryConfig) {
      const minX = Math.min(...positions.map((p) => p.x), ...groupBoxes.map((b) => b.x), ...bcBoxes.map((b) => b.x));
      const minY = Math.min(...positions.map((p) => p.y), ...groupBoxes.map((b) => b.y), ...bcBoxes.map((b) => b.y));
      const maxX = Math.max(
        ...positions.map((p) => p.x + NODE_WIDTH),
        ...groupBoxes.map((b) => b.x + b.width),
        ...bcBoxes.map((b) => b.x + b.width)
      );
      const boundaryMaxY = Math.max(
        maxDetourY,
        ...groupBoxes.map((b) => b.y + b.height),
        ...bcBoxes.map((b) => b.y + b.height)
      );

      cells.push(
        graph.createNode({
          id: BOUNDARY_ID,
          shape: "arch-boundary",
          x: minX - BOUNDARY_PADDING,
          y: minY - BOUNDARY_PADDING,
          width: maxX - minX + BOUNDARY_PADDING * 2,
          height: boundaryMaxY - minY + BOUNDARY_PADDING * 2,
          zIndex: -(maxGroupDepth + 3),
          attrs: {
            icon: { "xlink:href": `/aws-icons/${boundaryConfig.icon}` },
            label: { text: boundaryConfig.label },
          },
        })
      );

      groupBoxes.forEach((box) => {
```

Then, immediately after the closing of that `groupBoxes.forEach((box) => { ... });`
call (still inside the `if (isAwsBoundaryView && boundaryConfig) { ... }` block — do
**not** change anything about the `groupBoxes.forEach` body itself, only what comes
right after its closing `});` and the block's own closing `}`), add the bounded-context
rendering as its own, independently-gated block:

```ts
    bcBoxes.forEach((box) => {
      cells.push(
        graph.createNode({
          id: box.group.id,
          shape: "arch-group",
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          zIndex: -(maxGroupDepth + 2),
          attrs: {
            body: { stroke: BC_STYLE.stroke, strokeDasharray: BC_STYLE.dash },
            icon: { display: "none" },
            label: {
              refX: 12,
              fill: BC_STYLE.stroke,
              text: `Bounded Context: ${box.group.name}`,
            },
          },
        })
      );
    });
```

(This is the exact same cell-creation code that used to live inside the `if
(isAwsBoundaryView...)` block — it has just moved to sit after that block closes, so it
runs unconditionally whenever `bcBoxes` is non-empty, regardless of
`isAwsBoundaryView`.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors introduced by this file (any pre-existing errors are confined
to the untracked `example/` directory).

- [ ] **Step 3: Commit**

```bash
git add src/components/ArchitectureGraph.tsx
git commit -m "fix(graph): render bounded-context boxes at the component level, not just AWS views"
```

---

## Task 5: Regenerate the `blog` bundle with organized components

**Files:**
- Modify: `public/okf-bundles/blog/.scan-manifest.json` (via the CLI, not by hand)
- Modify: `public/okf-bundles/blog/**/*.md` (regenerated output)

- [ ] **Step 1: Force a full rescan (the organizer is new, so every concept needs a fresh pass to pick up ddd_context)**

```bash
node -e '
const fs = require("fs");
const p = "public/okf-bundles/blog/.scan-manifest.json";
const m = JSON.parse(fs.readFileSync(p, "utf-8"));
delete m._repos["template-marketing-webapp-nextjs"];
fs.writeFileSync(p, JSON.stringify(m, null, 2) + "\n");
'
```

- [ ] **Step 2: Run the scan with `--force`**

```bash
npx tsx scripts/okf-scan/index.ts --repo-map repo-map.yaml --env prd --out public/okf-bundles/blog --force
```

`--force` is needed here specifically because the per-concept skip-if-unchanged check
only looks at each concept's own scanned facts hash — it has no way to know that the
*organizer* is new and every existing concept is still missing its `ddd_context`.
Without `--force`, concepts whose facts didn't change would be skipped and would never
pick up an organizer assignment. Expected output: `okf-scan: wrote 76, skipped 0
concept(s)` (or similar — every concept regenerates).

- [ ] **Step 3: Validate**

```bash
npm run validate
```

Expected: `validate-model: all architecture models are valid.`

- [ ] **Step 4: Confirm ddd_context assignments landed**

```bash
node -e '
const fs = require("fs");
const m = JSON.parse(fs.readFileSync("public/okf-bundles/blog/.scan-manifest.json", "utf-8"));
const entries = Object.values(m.concepts);
console.log("total concepts:", entries.length);
'
grep -rl "ddd_context:" public/okf-bundles/blog/template-marketing-webapp-nextjs/*.md | wc -l
```

Expected: a majority of the ~61 component `.md` files under
`public/okf-bundles/blog/template-marketing-webapp-nextjs/` now have a `ddd_context:`
frontmatter line.

- [ ] **Step 5: Commit**

```bash
git add public/okf-bundles/blog
git commit -m "chore(okf-scan): regenerate blog bundle with organizer-assigned ddd_context groups"
```

---

## Task 6: Manual browser verification

No automated test infrastructure exists for `ArchitectureGraph.tsx` today (it's an
imperative AntV X6 integration, verified manually per the project's established
pattern) — this task is the manual check that everything actually renders correctly
end to end.

- [ ] **Step 1: Start the dev server if it isn't already running**

```bash
npm run dev
```

- [ ] **Step 2: Open the same URL that originally showed the illegible graph**

Navigate to:
`http://localhost:3000/?source=blog&parent=template-marketing-webapp-nextjs`

- [ ] **Step 3: Confirm bounded-context boxes are now visible**

Click "Fit". Confirm dashed "Bounded Context: <name>" boxes now group the components
into a handful of visually distinct clusters, instead of one flat wall of 61 sibling
nodes. Zoom into 2-3 of the boxes and confirm the grouping is plausible given each
component's name/type (e.g. navigation-related components grouped together, product
components grouped together).

- [ ] **Step 4: Confirm the Wiki tab shows the new fields**

Click a component node, switch to the "Wiki" tab, confirm its "Domain-Driven Design"
section (per `DetailsPanel`) now shows a `ddd_context` and `ddd_role` where the
organizer assigned one.

- [ ] **Step 5: Report the outcome**

Summarize what the diagram looks like now vs. before (rough count of bounded-context
groups formed, whether any group still looks too large/overlapping per the accepted
"Deferred" limitation in the design doc), so the user can decide whether the
layout-algorithm follow-on work is actually needed.
