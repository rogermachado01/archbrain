# Bounded-Context Cluster Navigation — Design

## Problem

A container with many children (e.g. `template-marketing-webapp-nextjs`, 76 components in the
`blog` bundle) renders every child flat, at once. The recently-shipped "Bounded Context" dashed
box (`computeBoundedContextBoxes` in `src/lib/groups.ts`, wired into
`src/components/ArchitectureGraph.tsx`) only draws a decorative outline around
already-positioned nodes — it never changes layout or reduces how many nodes are on screen, so a
76-node container is still a 76-node wall, just with some dashed lines on top. Rows within a
topological layer are also ordered by whatever order `ArchModel.nodes` happens to list them in
(scanner/discovery order), not by `ddd_context`, so same-context nodes aren't even guaranteed to
land next to each other — the box can end up spanning most of the view.

## Goal

Turn each distinct `ddd_context` among a container's children into a collapsible cluster, so the
container shows a handful of clusters by default instead of all children at once. Drilling into
a cluster reveals its real members — the same interaction model the app already uses for
Context → Container → Component navigation.

## Decisions made during brainstorming

- **Threshold: always cluster.** Any container whose children include at least one
  `ddd_context` value shows clusters, with no minimum child count. Trade-off accepted: a
  container with only 2-3 tagged children also requires one extra click to see them — simplicity
  over a tunable magic number.
- **Untagged siblings → an "Outros" cluster.** Any child with no `ddd_context`, in a container
  that otherwise has tagged children, is bucketed into a synthetic "Outros" cluster rather than
  shown loose next to the real clusters.
- **No ArchModel changes.** Clusters are derived purely from `node.ddd.context` at render time,
  the same way `computeBoundedContextBoxes` already is — nothing new is persisted to JSON/OKF
  bundles.

## Non-goals

- Nested/recursive clustering (a cluster whose own members should further sub-cluster) — out of
  scope; if a single cluster is still too large in practice, that's a follow-on problem.
- An LLM-derived "user flow" taxonomy as an alternative or additional grouping dimension — raised
  during brainstorming as an alternative to `ddd_context`, but it's an orthogonal taxonomy
  question (what to group by), not a rendering mechanism, and can plug into this same clustering
  mechanism later without changing anything described here.
- Removing or reworking the existing dashed "Bounded Context" box overlay (`computeBoundedContextBoxes`)
  — see "Interaction with the existing box overlay" below.

## Data model addition

`ArchNode` (`src/lib/types.ts`) gets one new optional field:

```ts
synthetic?: {
  kind: "bounded-context-cluster";
  memberIds: string[];
};
```

A cluster is a real `ArchNode`-shaped object (so it flows through the existing layout/render
pipeline unmodified) that is *synthesized at render time*, never loaded from a data source and
never part of `archModel.nodes`. Its `id` is namespaced with a new prefix, `CLUSTER_ID_PREFIX =
"__cluster__:"` (kept distinct from the existing `BC_GROUP_ID_PREFIX = "__bc__:"` used by the box
overlay, since the two now have different interactivity semantics — see below). The "Outros"
bucket uses a fixed sentinel id (`${CLUSTER_ID_PREFIX}__ungrouped__`) rather than the literal
string "Outros", so it can't collide with a real context someone names "Outros".

## New pure logic: `src/lib/clusters.ts`

A new function, `computeClusterView(children: ArchNode[]): { visibleNodes: ArchNode[]; membershipOverride: Map<string, string> } | null`:

- Returns `null` when no child has `ddd.context` set (the container renders exactly as it does
  today — no behavior change for untagged data).
- Otherwise returns one synthetic cluster `ArchNode` per distinct `ddd.context` value (plus the
  "Outros" cluster if any child is untagged), each carrying `synthetic.memberIds` and a
  `name`/label like `"Navigation Content (6)"`.
- `membershipOverride` maps every real child id to the cluster id it collapsed into — consumed by
  the relations-rollup extension below.

This is pure and unit-testable the same way `computeBoundedContextBoxes` is today — no X6, no
React.

## Navigation model

One new URL param, `cluster` (alongside the existing `parent`/`node`/`panel`), meaning "within
the current `parent`, show only members whose `ddd.context` matches this cluster." Read via
`useSearchParams()` exactly like the app's other navigation state (`ArchVizApp.tsx` — no new
`useState`, consistent with the project's existing "derive from URL" pattern).

- `cluster` unset + `computeClusterView` returns non-null → render the cluster pseudo-nodes.
- `cluster` set → render the real children whose `ddd.context` (or lack thereof, for the "Outros"
  sentinel) matches, exactly like today's flat rendering.
- Double-clicking a cluster node sets `cluster=<name>` via the existing `updateUrl` helper.
  Clicking a breadcrumb segment for the cluster (see below) or navigating to a different `parent`
  clears it.
- Search results and any other direct navigation to a specific node (`?node=<id>`) must
  auto-derive and set `cluster=<that node's ddd.context>` if its parent container currently
  clusters — otherwise the target node would be deep-linked into a view that doesn't render it
  (it's collapsed inside a cluster pseudo-node instead).

## Breadcrumb

`getBreadcrumb` (`src/lib/model.ts`) walks `parentId` over real nodes only, so the active cluster
isn't part of it. `ArchVizApp` appends one extra, synthetic breadcrumb segment for the active
cluster name when `cluster` is set (e.g. `Context / Template Marketing Webapp Nextjs / Navigation
Content`), clicking it clears `cluster` while keeping `parent`.

## Relations rollup extension

`getRelationsForViewWithRollup`/`nearestVisibleAncestor` (`src/lib/model.ts`) currently only walk
a node's real `parentId` chain looking for a visible ancestor. Clustering needs a second
resolution path: a real child collapsed into a cluster must resolve to that cluster's id instead
of continuing up to the container (which also isn't visible while showing clusters).

`nearestVisibleAncestor` gets an optional `clusterOverride?: Map<string, string>` parameter,
consulted at *each step* of the existing walk (not just the starting id, since an node several
levels below the clustered container also needs to resolve through it): before checking
`visibleIds.has(current.id)`, check `clusterOverride.get(current.id)` first and return it
immediately if present. When `cluster` is set (drilled into one specific cluster), no override is
passed — this matches the app's existing, already-accepted behavior where a relation to a
sibling container's descendant (not visible at the current drill level) is simply dropped, not
force-rolled-up; the same now applies to a sibling *cluster's* member. Scope is deliberately
limited to relations between two clusters of the *same* parent container, visible
simultaneously in the cluster-list view — not a general "always find some visible node" search.

## Rendering (`ArchitectureGraph.tsx`)

Cluster pseudo-nodes go through the exact same `computeLayeredPositions` call as real nodes — no
new layout code. They need a distinct visual treatment (a stack/group icon instead of an
AWS/frontend icon, sublabel showing member count instead of `technology`) but reuse the existing
`arch-node` X6 shape. `structuralIds` (used today to make AWS/BC group boxes non-interactive)
must NOT include cluster ids — cluster nodes are fully interactive (single-click selects,
double-click drills in, exactly like real nodes), just gated by `node.synthetic?.kind ===
"bounded-context-cluster"` wherever the app currently branches on "is this a real resource."

**Single-click on a cluster** shows a lightweight synthetic summary in `DetailsPanel` (member
count and the list of member names/types) rather than a real `aws.properties` block — it has no
AWS config to show. The Wiki tab is disabled for a cluster selection (no underlying markdown
file), same disabled-state pattern already used today when the active `DataSource` has no
`okfBasePath`.

## Interaction with the existing "Bounded Context" box overlay

`computeBoundedContextBoxes`/the dashed box rendering (shipped in the prior DDD-organizer plan)
stays as-is — no code removal. In practice it becomes dormant on the common path: once clustering
is the default view for any tagged container, you rarely see two different `ddd_context` values
rendered flat and simultaneously anymore (the one remaining case is two clusters' worth of nodes
being visible at once, which no longer happens since clusters collapse first). It remains
correct, harmless fallback code for any future scenario where multiple contexts do appear in the
same flat view.

## Testing

- `src/lib/clusters.ts` (`computeClusterView`): unit tests — no context data → `null`; single
  context → one cluster node with correct `memberIds`; mixed tagged/untagged → "Outros" bucket
  behavior; naming/count-label formatting.
- `src/lib/model.ts` (`nearestVisibleAncestor`/`getRelationsForViewWithRollup` with
  `clusterOverride`): unit tests — relation between two same-parent clustered siblings rolls up
  to the two cluster ids; relation to a sibling *cluster's* member with no override passed (i.e.
  drilled into one cluster) is dropped, matching existing sibling-container behavior.
- `ArchitectureGraph.tsx`/`ArchVizApp.tsx` wiring: manual browser verification only, consistent
  with this codebase's existing established pattern for the imperative X6 integration and its
  URL-derived navigation state (no automated test infra for either today).

## Deferred / open risks

- "Always cluster" means even a 2-3-child tagged container gets an extra click. Revisit with a
  minimum-count threshold later if this proves annoying in practice — deliberately not building
  a tunable threshold now (YAGNI) since the recommendation was to keep the rule simple.
- An LLM-derived "user flow" grouping as an alternative taxonomy to `ddd_context` was raised but
  explicitly deferred (see Non-goals) — the clustering mechanism built here is taxonomy-agnostic
  (it groups by whatever `getGroupId`-equivalent key it's given), so adding a second grouping
  dimension later is additive, not a rewrite.
