# OKF Scan Humanization — Design

## Problem

Manually reworking the `blog` bundle into `blog2` (previous work session, see
`converter.md` at the repo root) surfaced a set of gaps between what `okf-scan`
generates and what a hand-authored bundle like `webapp` looks like. Investigating
`scripts/okf-scan/synthesize/` confirmed every one of them is a **structural bug or
missing capability in the pipeline itself**, not something specific to the one repo
`blog` was scanned from:

1. **`titleize()` breaks on bracketed route segments** (`markdown.ts`). It title-cases
   the last path segment of a concept id but does not strip literal `[`/`]` — a Next.js
   dynamic route `[slug]` produces the title `"[Slug]"`, which becomes the anchor text
   of every markdown link pointing at it (`writeChildIndexes`, `writeRootFiles`,
   `buildRelationsSection`). Combined with the outer markdown link brackets, this
   produces `[[Slug]](...)`, which the importer's link regex
   (`src/lib/okf-import.ts`, `extractLinks`) cannot parse — the link silently fails to
   extract and the concept is never discovered from its parent `index.md`. Reproduced
   and confirmed live in the browser (via `read_network_requests`: the `[slug].md`
   fetch never fired) before being hand-patched in `blog2`. This will recur for any
   future scan of a repo using bracketed dynamic routes.
2. **No concept ever gets an `icon`.** `buildConceptMarkdown` never emits `icon:` in
   frontmatter. The importer falls back to `findAwsIcon(type)`
   (`src/lib/aws-icons.ts`), which only matches official AWS service names — none of
   the scanner-produced types (`React Component`, `Next.js Page`, etc.) match anything,
   so every scanned concept renders with no icon.
3. **Root file content is a fixed placeholder, not preserved across re-scans.**
   `writeRootFiles` always writes `title: "Generated Architecture"` and only ever
   toggles `boundary: false` (never `boundary_label`/`boundary_icon`) — and, unlike
   concept files (which preserve `ddd_*`/Links via `readPreserved`), root-level
   `index.md` is fully regenerated every run with **no preservation of hand edits at
   all**. Any manual title/description/boundary curation would be silently discarded
   on the next scan.
4. **No context-level actors are ever synthesized.** A scanned bundle only ever
   contains what exists as code — it has no way to represent a human visitor or an
   external system (a CMS, an IdP) that the code merely calls out to. `blog`'s root
   `index.md` had exactly one concept: the scanned app itself.
5. **Flat containers with many children have no path to becoming real sub-containers.**
   The existing `OrganizerClient` (`organize.ts`, shipped per
   `2026-07-06-ddd-organizer-agent-design.md`) already groups a large flat container's
   children into `ddd_context`/`ddd_subdomain`/`ddd_role` **tags** — but never
   materializes that grouping into real containers/subdirectories. The user's own
   reaction to the tagged-but-flat `blog2/shared-ui` view (before manual restructuring)
   was that it still read as "a series of connected boxes" with no clear story — the
   tags alone didn't fix legibility, only a real hierarchy did.

## Goal

Fix items 1–4 unconditionally as plain code changes (Track A). Give the pipeline a
mechanical, reviewable path to do what was done by hand for `blog2` — materializing a
flat container into named capability sub-containers, and inferring root-level actors —
without repeating the two path bugs the manual, post-hoc markdown-editing approach
produced (Track B). Gate Track B behind a review step, via a new Claude Code Skill,
rather than letting an LLM call silently reshape a bundle's file tree on every scan.

**Scope note**: Track A and Track B are independently shippable — Track A is small,
low-risk, and has no dependency on Track B (or vice versa). They should become two
separate implementation plans/PRs rather than one, so Track A's quick wins aren't
blocked on Track B's larger review-workflow design landing first.

## Non-goals

- **Changing `computeLayeredPositions` or any other rendering code.** This is entirely
  a content-generation change on the `okf-scan` side. If the resulting hierarchy still
  renders awkwardly, that's the follow-on work the `ddd-organizer-agent` spec already
  deferred, not something reopened here.
- **Automatically applying Track B without review.** Explicitly rejected — see
  "Track B" below for why, and what triggered this decision.
- **A generic, cross-repo "grouping quality" evaluation harness.** Track B's grouping
  and actor-inference calls are judged the same way the existing `describeConcept`/
  `organizeChildren` calls already are: prompt discipline + human review of output, not
  automated scoring.
- **Rewriting `blog2` itself to be produced by this pipeline.** `blog2` stays a
  hand-authored artifact from the previous session; this spec is about how the next
  bundle gets this quality without manual intervention.

## Track A — deterministic fixes

All in `scripts/okf-scan/synthesize/`, no LLM involved, ship unconditionally.

### A1. Bracket-safe `titleize()`

```ts
export function titleize(id: string): string {
  const last = id.split("/").pop() ?? id;
  const cleaned = last.replace(/^\.\.\./, "").replace(/[[\]]/g, "");
  return cleaned.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
```

`[slug]` → `Slug`, `[...slug]` (catch-all) → `Slug`. This changes both the concept's
own display title and every place it's referenced as link anchor text — deliberately
one function, not a separate "link-safe" variant, so the two can never drift apart
the way they did in the manual `blog2` fix (which only patched the one link, not a
shared root cause).

### A2. `findFrontendIcon(type)` — new file, `scripts/okf-scan/synthesize/frontend-icons.ts`

A small static lookup for the non-AWS concept types the scanners actually produce
today, mirroring `findAwsIcon`'s shape but intentionally **not** unified with
`src/lib/aws-icons.ts` — that manifest indexes 305 official AWS service icons; this
one only ever needs the handful of `fe-*.svg`/`user.svg`/`generic-application.svg`
files already in `public/aws-icons/` (see CLAUDE.md's "AWS visual style" section).
Table (extend as new scanner-produced types appear):

| `type` | icon |
|---|---|
| `Next.js Page`, `React Route` | `fe-screen.svg` |
| `Redux Slice`, `Store` | `fe-store.svg` |
| `API Client`, `Service` | `fe-service.svg` |
| `Design System Package`, `UI Capability` (new, see Track B) | `fe-design-system.svg` |
| `Custom Hook`, `React Hook` | `fe-hook.svg` |
| `React Component` (fallback) | `fe-component.svg` |
| `Person` | `user.svg` |
| `External System` | `generic-application.svg` |

`buildConceptMarkdown` sets `frontmatter.icon = findFrontendIcon(facts.type)` when
`facts.awsResourceType` is unset (an AWS-typed concept keeps relying on the importer's
own `findAwsIcon` fallback at render time — untouched).

### A3. Boundary default for frontend-only bundles

`writeRootFiles`'s existing condition for `boundary: false`
(`!hasPlatformChildren && groups.length === 0`) instead emits:

```yaml
boundary_label: "Browser — {root title}"
boundary_icon: generic-application.svg
```

matching the `webapp`/`blog2` convention instead of disabling the boundary box.

### A4. Root content: real title + preservation across re-scans

- Title: derived from the scanned system's own name (e.g. the single top-level
  concept's title + " — Frontend", or the repo-map config's own label when multiple
  top-level concepts exist) instead of the `"Generated Architecture"` placeholder.
- **Preservation**: extend the existing `readPreserved`/`ExistingConceptFile` pattern
  (today scoped to per-concept `ddd_*`/Links) to the root `index.md` as well — read
  its current `title`/`description`/`boundary_label`/`boundary_icon` before
  regenerating, and keep any hand-set value exactly the way a concept's hand-set
  `ddd_context` is never overwritten. Without this, items 3/4's output would be
  clobbered on the very next scan, same as today.
  - Same tradeoff `ddd_context` already has today applies here too: once *any* value
    is on disk — whether a human set it or a previous pipeline run auto-generated it
    — it's sticky forever. Concretely, a bundle produced by the pipeline before this
    change (with `boundary: false` already written) keeps `boundary: false` after
    upgrading; it does not silently flip to the new `boundary_label` default. Force a
    re-generation (`--force`, the same flag already used to bypass the manifest
    cache) to pick up the new default on an existing bundle.

## Track B — materialization + actor inference (gated)

### Why gated, not automatic

Doing this reconstruction by hand for `blog2` — even carefully, with `npm run
validate` run after every step — still produced two real path bugs (a same-directory
relation getting an incorrect capability prefix, and a cross-directory relation
missing its `../`). An LLM-driven version of the same operation, run unattended on
every scan of every repo, has no equivalent safety net catching a bad grouping
decision (e.g., splitting a cohesive container into confusing or overlapping
capability names) until a human happens to look at the result. Track B always
produces a **proposal** first; applying it is a separate, explicit step gated by the
new Skill (see below).

### B1. Materialization mechanism — rewrite `ConceptFacts` before markdown is written

This is the key architectural decision (Approach 1 of three considered; see appendix)
: perform the restructuring **upstream of `buildConceptMarkdown`**, as a transformation
over `ConceptFacts[]`, not as a post-hoc rewrite of already-rendered markdown files.
`relativeLinkFromTo`/`buildRelationsSection`/`writeChildIndexes` already compute every
link as a generic `path.relative()` between two ids — give a concept a new id and the
existing code produces correct paths automatically. This is what eliminates the class
of bugs the manual regex-based approach hit: there is no regex-editing-already-written-markdown
step at all in this design.

**Trigger**: a container whose children (a) number at least `MATERIALIZE_MIN_CHILDREN`
(proposed: `15` — deliberately higher and a separate constant from `organize.ts`'s
existing `ORGANIZE_MIN_CHILDREN = 9`, since tagging a moderate-size container with
`ddd_context` is low-risk but restructuring its file tree is not), and (b) the
organizer returned at least 2 distinct group names for them (materializing into a
single group is a no-op not worth the restructuring).

**Transform, given the organizer's `{ childId: ContextAssignment }` output for a
container**:

1. Group child ids by `assignment.context`.
2. For each group with 2+ members: synthesize one new `ConceptFacts` — `type: "UI
   Capability"`, `level: "container"`, `id: "${containerId}/${slugify(contextName)}"`,
   `parentId: containerId` — and rewrite every member's `id` to
   `"${newContainerId}/${leafSegment}"` and `parentId` to `newContainerId`.
3. For each group with exactly 1 member that is the *target* of relations from 3+
   other groups (the `theme.md` case from `blog2` — a shared dependency, not a real
   capability): promote it to a sibling of the original container (`id:
   "${parentOf(containerId)}/${leafSegment}"`) instead of wrapping it in its own
   single-file capability directory.
4. Build an old-id → new-id map from every rename in steps 2–3, then walk **every**
   concept's `relations[].targetId` in the whole bundle (not just the moved ones —
   e.g. `[slug].md`'s relation into a moved `shared-ui` component must also be
   remapped) and rewrite any id found in the map. This is a structural rename over
   already-parsed `targetId` strings, not text search — the reason it doesn't
   reproduce the manual approach's bugs.
5. Drop `ddd_context` from every materialized leaf's preserved fields when writing
   its markdown (kept: `ddd_subdomain`/`ddd_role`) — once the real directory exists,
   the tag only causes `computeClusterView` to wrap the container's children in one
   redundant single-member cluster, exactly the bug hit and fixed by hand this
   session (see `converter.md` item 9).
6. Each new capability container's own prose/description and its container-level
   relations are produced by **reusing the existing per-concept `llm.describeConcept`
   call** — no new LLM client for this part. Its synthesized `ConceptFacts.relations`
   is: for every *other* new capability container B such that at least one leaf under
   this container has a relation targeting a leaf now under B, one `FactRelation`
   carrying that leaf relation's `evidence` (first match if several) — `describeConcept`
   then produces a business-flow-phrased label for it exactly as it already does for
   every other relation today.

**One-shot rule**: the manifest gains a new top-level map,
`materializedContainers: Record<string, { appliedAt: string }>`. Once a container id
appears here, it is permanently excluded from both the organizer trigger
(`containersNeedingOrganizing`) and the materialize trigger on all future runs — its
grouping was a reviewed, one-time decision, not something to keep re-deciding (and
potentially re-shuffling) on every scan. Adding a genuinely new component to an
already-materialized container is an explicitly accepted manual-intervention case: a
human decides which existing capability it joins (or that a new one is warranted),
the same way a hand-authored bundle would be extended.

**Type note**: `ConceptFacts` is documented as "Structured, evidence-only output of a
scanner... Never contains prose" — a materialized capability container is not scanner
output. It's modeled as an ordinary `ConceptFacts` (so it flows through every existing
code path unmodified) but tagged `synthesizedBy: "materializer"` (new optional field)
so tooling can distinguish it from scanned facts if that ever matters (e.g. excluding
it from a future re-scan's input-hash comparison).

### B2. `ActorInferenceClient` — new module, `scripts/okf-scan/synthesize/actors.ts`

```ts
export interface ActorProposal {
  type: "Person" | "External System";
  title: string;
  description: string;
  relations: { targetId: string; label: string; kind?: RelationKind }[];
}

export interface ActorInferenceClient {
  inferActors(concepts: ConceptFacts[]): Promise<ActorProposal[]>;
}
```

Called once per bundle (root scope, not per-container like the organizer) — the only
call in Track B that needs to reason over the *entire* scanned bundle at once, since
"is there an implied human visitor" or "is there an implied external CMS" are
judgments about the system as a whole, not about any one concept. Same anti-
hallucination discipline as the existing prose prompt (`llm.ts`): grounded only in
scanned facts already present (a `type: "API Client"` targeting a URL outside the
scanned repos implies an external system; a route-serving frontend app with nothing
scanned as its caller implies a human visitor) — explicitly instructed not to invent
anything beyond what's evidenced, and to propose zero actors when the evidence is
too thin to be confident, mirroring `organize.ts`'s existing soft-degrade philosophy
(a hiccup here must never block synthesis of the rest of the bundle).

Each accepted proposal becomes an ordinary root-level `ConceptFacts`
(`parentId: null`, `level: "context"`, `external: true` — mapped to the same
`icon:` table as Track A: `user.svg`/`generic-application.svg`), flowing through
`describeConcept` + `buildConceptMarkdown` like any other concept — no new
markdown-writing code.

## The review Skill

New Claude Code Skill (exact path TBD at implementation time — need to confirm
whether this repo already has a project-local skills convention, or whether this is
the first one; check during planning rather than guess here).

**CLI surface** (new flags on the existing `okf-scan` command):

- `--materialize=propose` — runs the organizer + actor-inference calls, but instead of
  writing any markdown or touching the manifest's `materializedContainers`, writes a
  single JSON file (`<bundleDir>/.materialize-proposal.json`): per over-threshold
  container, the proposed groups (name, member ids, count) and promotions; the
  proposed actor concepts. Cheap, side-effect-free, safe to re-run.
- `--materialize=apply --plan=<path>` — takes a (possibly hand-edited) copy of that
  proposal and performs the actual transform from B1/B2, then runs the normal
  `synthesize()` write path.

**Skill workflow**:

1. Run `okf-scan --materialize=propose` on the target bundle.
2. Read the proposal file. Walk the developer through each proposed group and actor
   one at a time — accept as-is, rename, merge two groups, or drop an actor —
   mirroring the same one-decision-at-a-time review this design itself went through.
3. Write the (possibly edited) plan, run `okf-scan --materialize=apply --plan=...`.
4. Run `npm run validate`; report pass/fail before suggesting a commit.
5. Offer to start the dev server and open the affected container in a browser so the
   developer can eyeball the result before committing — the same manual verification
   loop used throughout the `blog2` work.

## Testing

- `markdown.test.ts`: `titleize` cases for `[slug]`, `[...slug]`, and a plain segment
  (regression guard for the exact bug hit in `blog2`).
- `frontend-icons.test.ts` (new): every table entry resolves; unknown type → `undefined`.
- `organize.ts`/new materializer module: unit tests with a mocked `OrganizerClient`
  output covering — a container at exactly the threshold; a single-member group with
  3+ external referrers promoted correctly; a relation from an *unmaterialized*
  concept into a materialized one gets its `targetId` remapped; a second run against
  an already-materialized container is a no-op (one-shot rule).
- `actors.ts` (new): mocked-client tests covering zero-confidence → empty proposal
  list; a well-formed multi-actor response; a malformed response soft-degrades to no
  actors rather than failing the run.
- **Rollout**: regenerate a real scanned bundle end-to-end (Track A only first, then
  Track B via the Skill), diff against `blog2`'s hand-authored result for the same
  source repo where feasible, and manually verify in the browser per the Skill's own
  step 5.

## Deferred / follow-on

- Unifying `findFrontendIcon` with `src/lib/aws-icons.ts` behind one shared manifest —
  not needed while the frontend-icon table stays this small (8 entries); revisit if it
  grows enough to justify the indirection.
- Extending materialization to handle a component added later to an already-decided
  container automatically proposing "does this fit an existing capability" — explicitly
  manual for now (see B1's one-shot rule).
- A leaner "just re-word the cluster labels shown in the UI" client-side improvement
  (Approach 3 considered during brainstorming) was explicitly not pursued as a
  stopgap once Approach 1 was chosen as the permanent mechanism — noting here only so
  a future reader doesn't wonder why it isn't mentioned elsewhere in this doc.

## Appendix: materialization mechanism alternatives considered

1. **(Chosen) Rewrite `ConceptFacts.id`/`parentId` before markdown synthesis.** See B1.
2. **Post-hoc markdown rewriting** — move already-written files, regex the `#
   Relations` hrefs. This is literally what was done by hand for `blog2`, and it
   produced two real path bugs in the process (a same-directory relation gaining a
   bogus capability prefix; a cross-directory relation missing its `../`). Rejected as
   the pipeline's mechanism precisely because of those failures.
3. **Never materialize into files; only improve the client-side cluster view.** Zero
   file-restructuring risk, but the Wiki tab, search, and deep links would not reflect
   the improved grouping, since there would be no real container to link to — a
   weaker fit for "help the team navigate the docs" than real containers. Rejected as
   the primary mechanism (see "Deferred" above for why it also wasn't kept as an
   interim stopgap).
