# DDD Organizer Agent — Design

## Problem

Regenerating the `blog` OKF bundle (previous work session) fixed the "zero relations"
bug, but exposed a second, equally real problem: the `template-marketing-webapp-nextjs`
container has 61 flat sibling components and 129 relations, all rendered as one big
component-level view. Visiting
`http://localhost:3000/?source=blog&parent=template-marketing-webapp-nextjs` and
clicking "Fit" confirms it — the layered left-to-right layout algorithm stretches this
into an extremely tall, narrow column (9% zoom to fit on screen), and even zooming in
manually shows relation labels floating disconnected from any visible node, because
everything is spread across ~15 topological layers with very few nodes per layer. This
directly undermines the app's stated purpose (visualizing an application's knowledge in
an understandable way).

The app already has a rendering feature built for exactly this kind of problem —
"Bounded Context" boxes (`computeBoundedContextBoxes` in `src/lib/groups.ts`), which
group nodes sharing the same `node.ddd.context` value into a labeled box — but two
things stop it from helping here:

1. `ddd_context`/`ddd_subdomain`/`ddd_role` are, by explicit prior design decision
   (documented in `CLAUDE.md`), **never written by the `okf-scan` pipeline** — they're
   treated as a manual curation step. No component in this bundle has one.
2. Even if they were set, `ArchitectureGraph.tsx` currently only renders bounded-context
   boxes when every visible node is `level: "container"` (`isAwsBoundaryView`'s gate) —
   never at the component level, which is exactly the view that's illegible here.

## Goal

Add an LLM-powered "organizer" step to the `okf-scan` pipeline that looks at all of a
container's scanned children at once and assigns each one a `ddd_context` (grouping),
`ddd_subdomain` (core/supporting/generic), and `ddd_role` (tactical role) — the same
three fields the app already knows how to render — so a container like
`template-marketing-webapp-nextjs` breaks into a handful of labeled, semantically
meaningful groups instead of one flat wall of 61 siblings. Relax the one rendering gate
that currently prevents bounded-context boxes from ever appearing at the component
level.

## Non-goals

- **Changing the layout algorithm** (`computeLayeredPositions` in `src/lib/layout.ts`).
  Bounded-context boxes are a pure visual overlay drawn around wherever their member
  nodes already landed post-layout — they do not pull members physically closer
  together. For this specific, deeply-chained component tree, that means some boxes may
  still end up overlapping or spanning much of the diagram even after this work ships.
  Explicitly accepted as a follow-up concern, not solved here — see "Deferred" below.
- **Rewriting or discarding existing hand-curated `ddd_*` values.** The pipeline already
  has a preserve-on-regeneration mechanism for these three fields
  (`readPreserved`/`ExistingConceptFile` in `scripts/okf-scan/synthesize/markdown.ts`);
  this work must never override a value a human already set by hand.
- **Applying only above some component-count threshold.** The organizer runs for every
  container with children, regardless of size (simpler, and an unconditional contract is
  easier to reason about than a magic-number cutoff).
- **A separate, standalone/manual tool.** This is a new stage inside the existing
  `synthesize()` flow in `scripts/okf-scan/synthesize/synthesize.ts`, running as part of
  every normal `okf-scan` invocation — not an opt-in flag or a post-processing script.

## Architecture

New module: `scripts/okf-scan/synthesize/organize.ts`.

```ts
export interface ContextAssignment {
  context?: string;
  subdomain?: DddSubdomain; // "core" | "supporting" | "generic"
  role?: string;
}

export interface OrganizerClient {
  organizeChildren(
    containerId: string,
    children: { facts: ConceptFacts; existingContext?: string }[]
  ): Promise<Record<string, ContextAssignment>>; // keyed by child concept id
}

export function createAnthropicOrganizerClient(apiKey?: string): OrganizerClient;
```

Mirrors the shape of the existing `LlmClient` in `llm.ts` (same retry/backoff pattern
against the real Anthropic API), but is a **distinct interface** because its unit of
work is fundamentally different: `LlmClient.describeConcept` reasons about one concept
in isolation; `OrganizerClient.organizeChildren` needs to see an entire container's
sibling set at once to produce a coherent, shared taxonomy (a per-concept call has no
way to know that another component already exists to share a group with, so it can't
avoid inventing redundant near-duplicate group names for what's conceptually the same
cluster).

**Wiring into `synthesize.ts`:** group `scanResult.concepts` by `parentId`. For each
group with at least one child, call `organizeChildren` once, passing every child's
`ConceptFacts` (id, type, relations — enough for the model to infer what each component
does and how it connects to its siblings) plus, for any child whose file already has a
hand-set `ddd_context` (read via the existing `readPreserved` mechanism), that value as
an `existingContext` anchor. The prompt instructs the model to reuse an anchor's name
for any other component that conceptually belongs to the same group, rather than
inventing a second name for it — so newly-scanned components slot into an existing
human-curated taxonomy consistently instead of fragmenting it.

**Precedence when writing each concept's final frontmatter:** a concept's own
`preserved.ddd_context`/`ddd_subdomain`/`ddd_role` (hand-set, read from the file that
already existed on disk) always wins outright — the organizer's assignment for that
concept is simply discarded, never merged or partially applied. Only a concept with no
preserved value for a given field gets the organizer's assignment written for that
field. This is the same precedence rule the pipeline already applies to `ddd_context`
today (per `CLAUDE.md`), just now with an actual writer feeding the empty case instead
of leaving it permanently blank.

## Prompt & parsing contract

Same "plain delimited text, not strict JSON" convention `llm.ts`'s `parseDescription`
already established for relation labels — more tolerant of an LLM response that's
slightly malformed than a JSON parse would be. One line per child, keyed by concept id
(not position, since omissions/reordering must not corrupt unrelated entries):

```
CONTEXT ASSIGNMENTS:
template-marketing-webapp-nextjs/header: context=Navigation | subdomain=supporting | role=Presentational Component
template-marketing-webapp-nextjs/ctf-product-table-gql: context=Product Catalog | subdomain=core | role=Data Fetching Wrapper
...
```

Parsed line-by-line via regex, matching each line's leading `conceptId` against the
known children set. **Per-field, per-concept soft degrade:** a missing line, an
unparseable line, or a `subdomain` value outside the `core`/`supporting`/`generic` enum
all resolve to "no assignment for that field on that concept this run" rather than
failing the whole container or writing an invalid enum value that could later trip
`validateArchModel`'s `ddd_subdomain` enum check. This mirrors the exact fallback
philosophy already established for relation-label parsing: a formatting hiccup
degrades to "still blank, try again next run," never a hard failure that blocks
unrelated concepts in the same container from being written.

## Rendering change (`src/components/ArchitectureGraph.tsx`)

Bounded-context box visibility currently piggybacks on `isAwsBoundaryView` (which also
gates the AWS Cloud boundary box and AWS network groups, and requires every visible
node to be `level: "container"`). Decouple it:

```ts
const showBoundedContextBoxes = positions.some(({ node }) => node.ddd?.context);
```

The AWS boundary box and AWS network groups keep their existing `isAwsBoundaryView`
gate untouched — only the bounded-context box's condition changes, so it can now also
render at the component level (inside a drilled-into container), which is the view
this whole feature targets. `computeBoundedContextBoxes`'s own zIndex/overlap logic is
unaffected by this change; it already computes correctly whether or not AWS group boxes
are present in the same view (per its existing design, documented in `CLAUDE.md`).

## Testing

- `organize.ts`: unit tests mocking the Anthropic client (same pattern as
  `llm.test.ts`) covering: well-formed multi-child response parses correctly; a
  malformed/missing line for one child doesn't affect others; a `subdomain` value
  outside the enum is dropped for that child; an `existingContext` anchor passed in
  the prompt is referenced correctly in the request sent to the model.
- `synthesize.ts`: integration test proving a concept with a pre-existing hand-set
  `ddd_context` in its file is never overwritten by the organizer's output, even when
  the organizer's response for that concept differs.
- `ArchitectureGraph.tsx`: no new automated test infrastructure exists for this
  component today (it's tested manually per the project's established pattern for
  X6-based rendering) — verification here is the manual browser check described below,
  consistent with how this component's other changes have been verified historically.
- **Rollout**: after implementation, regenerate the `blog` bundle (same selective
  manifest-reset process as before), confirm via `npm run validate`, then visit
  `http://localhost:3000/?source=blog&parent=template-marketing-webapp-nextjs` in a
  browser and confirm bounded-context boxes are now visible, grouping the 61
  components into a handful of labeled clusters.

## Deferred / follow-on

- **Layout-aware grouping** — updating `computeLayeredPositions` to physically cluster
  same-`ddd_context` nodes near each other, so bounded-context boxes stop being a
  best-effort overlay and start reflecting an actually-clustered layout. Explicitly out
  of scope for this spec (see "Non-goals") — revisit only if the organizer's grouping,
  once shipped, still leaves the diagram hard to read in practice.
