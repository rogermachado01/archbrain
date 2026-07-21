# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

ArchViz is an interactive visualizer for cloud architecture, combining **C4 model layers**
(Context → Container → Component) with **AWS resource details**. The MVP scope is
visualization only: users navigate ("drill down") between architectural layers on a canvas
and inspect the AWS configuration of any selected resource. There is no editing or backend in
the MVP — architectures come from a registry of read-only data sources (plain JSON files and/or
OKF bundles, see "Data sources" below) that the user picks from in the header.

## Commands

```
npm run dev      # start dev server (Turbopack) at http://localhost:3000
npm run build    # production build (also runs the TypeScript check)
npm run start    # serve the production build
npm run lint     # ESLint (flat config, eslint.config.mjs)
npm run validate # validates every DATA_SOURCES entry (see "Data sources" below)
npx vitest run          # unit tests (scripts/okf-scan/**, src/lib/**)
npx tsc --noEmit -p .   # type-check only
```

`npm run test` runs the full Vitest suite (`scripts/okf-scan/**/*.test.ts` and
`src/lib/**/*.test.ts`). There is still no automated test coverage for React components
(`src/components/**`) — those are verified manually in a browser; see "Rendering pipeline" below.

## Important: Next.js version is newer than training data

This project pins **Next.js 16** (App Router), which post-dates most training data and has
breaking changes vs. the Next.js you may "remember." Before writing Next.js-specific code
(routing, data fetching, config, server/client boundaries), check
`node_modules/next/dist/docs/01-app/` for the current API — don't assume older conventions apply.

## Architecture

### Data model (`src/lib/types.ts`, `src/data/`)

The whole app is driven by an `ArchModel = { nodes: ArchNode[], relations: ArchRelation[] }`.
This is intentionally a flat list, not a nested tree:

- Every `ArchNode` has a `level` (`"context" | "container" | "component"`) and a `parentId`
  pointing at the node one layer up. Top-level Context nodes have `parentId: null`.
- Drilling into a node means filtering `nodes` by `parentId === thatNode.id` — see
  `getChildren` in `src/lib/model.ts`. There is no separate "diagram per view" file; views are
  computed on the fly from the flat model.
- `ArchRelation` is source/target by node id. `getRelationsForView` (`src/lib/model.ts`) shows a
  relation only if *both* endpoints are visible at that drill level; `ArchVizApp` actually calls
  `getRelationsForViewWithRollup` instead, which additionally walks a relation whose endpoint
  isn't visible up to its nearest visible ancestor, so e.g. a relation between two components in
  different containers still shows up (as an edge between those containers) once you're zoomed
  out past them — see "Relation kinds" below for how rollup and aggregation work.
- AWS-specific data lives under `node.aws = { resourceType, properties }`. Only nodes that
  represent real AWS resources have this; pure C4 "component" nodes (e.g. internal classes)
  can omit it.

`src/data/sample-architecture.json` is example data (an e-commerce platform: CloudFront → API
Gateway → Lambda → DynamoDB/SQS, plus one Lambda drilled down into its internal components).
The rest of the app has no hardcoded knowledge of specific AWS services or node ids, so any
conformant `ArchModel` works regardless of where it came from — see "Data sources" below for how
more than one is wired in.

### Data sources (`src/lib/data-sources.ts`)

`ArchVizApp.tsx` no longer imports `sample-architecture.json` directly. `DATA_SOURCES` is a registry of
`{ id, label, load(): Promise<ArchModel> }` entries rendered as a `<select>`
(`DataSourceSelector`) in the header; add an entry to add another architecture the user can pick,
whether it's another plain JSON file (`load: () => import("@/data/foo.json").then(m => m.default
as ArchModel)`, deferred via dynamic import so it's only fetched once selected) or an OKF bundle
(`load: () => importOkfBundle("/okf-bundles/foo")`). Every `load()` result is piped through
`validateArchModel` (`src/lib/validate-model.ts`) before it resolves — a malformed dataset (dangling
`parentId`/`groupId`/relation endpoint, id collisions, `parentId` cycles, wrong C4 level nesting)
rejects the promise instead of silently rendering an incomplete graph; the same validator runs
standalone via `npm run validate` (`scripts/validate-model.ts`) in CI.

Because loading is async (OKF bundles fetch several files), `ArchVizApp.tsx` tracks the *last completed*
load as `{ sourceId, model }`/`{ sourceId, message }` state and derives `archModel`/`loadError` by
comparing that stored `sourceId` against the currently-selected one, rather than resetting state
to `null` synchronously inside the load effect. **Keep it this way** — clearing state directly in
the effect body was tried first and is flagged by the `react-hooks/set-state-in-effect` ESLint
rule (cascading-render risk); deriving from a stored id needs no reset at all. Switching sources
also resets `currentParentId`/`selectedNodeId` back to the root, same as navigating home.

### Importing OKF bundles (`src/lib/okf-import.ts`)

[OKF (Open Knowledge Format)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
is a directory-of-markdown-with-YAML-frontmatter format for portable, agent-friendly knowledge
bundles. It has no concept of typed edges, diagram layout, icons, or network-boundary groups —
`importOkfBundle(basePath, io?)` converts a bundle into a plain `ArchModel` (our own rendering/data
model stays the source of truth; OKF is only ever an *input* format) by combining OKF's own
navigation mechanism with a couple of conventions layered on top, in the spirit of OKF's
"producers may add arbitrary additional keys" / "consumers must tolerate unknown fields":

- **Hierarchy** comes from directory nesting, exactly like OKF's real-world bundles: each
  `index.md` is a bullet list of markdown links (`- [Label](file.md) - description`), and a
  concept's children live in a same-named subdirectory next to it
  (`orders-service.md` + `orders-service/index.md`) — that nesting becomes the imported node's
  `parentId` chain. `AwsGroup`s (region/VPC/AZ/subnet) are discovered the same way from a
  separate `groups/` subtree, specifically special-cased at the bundle root (a root-level link to
  `groups/index.md`) so they land in `ArchModel.groups` instead of `nodes`.
- **Relations** (OKF has no typed edges — just untyped prose links) are parsed from a `# Relations`
  section: `- [target's title](relative/link.md) — label text {kind: async-event}`. The link's
  own anchor text is only for human navigation/readability; the actual `ArchRelation.label` is
  whatever text follows the link on that line (defaults to the link text if there's none). A single
  trailing brace group carries `kind:` and/or `pattern:`, in either order, both optional
  (`{kind: async-event}`, `{pattern: acl}`, or combined `{kind: async-event, pattern: ohs-pl}`) —
  `kind` sets `ArchRelation.kind` (omit for `"sync"`); `pattern` sets `ArchRelation.pattern`, a DDD
  context-map relationship (`partnership`/`shared-kernel`/`customer-supplier`/`conformist`/`acl`/
  `ohs`/`published-language`/`ohs-pl`) rendered as a `[ABBREV]` suffix on the edge label plus a
  legend row (`getVisiblePatterns` in `relation-style.ts`).
- **DDD metadata** comes from flat frontmatter fields — `ddd_subdomain` (`core`/`supporting`/
  `generic`), `ddd_context` (bounded-context name), `ddd_role` (tactical building block, e.g.
  "Aggregate Root") — populating `ArchNode.ddd`. `ddd_subdomain` renders as a corner badge + border
  tint on the node (core only); `ddd_context` groups same-valued nodes into a dashed "Bounded
  Context" box in the container-level view (`computeBoundedContextBoxes` in `groups.ts`), computed
  independently of and possibly overlapping AWS network groups — see "AWS network-boundary groups"
  below. `ddd_role` and `ddd_context` are also shown in `DetailsPanel`'s "Domain-Driven Design"
  section. None of the three validate beyond `ddd_subdomain`'s enum; `ddd_context` is a free string
  used only as a grouping key.
- **AWS resource config** comes from a `# Schema` section (`- key: value` bullets, coerced to
  number/boolean where possible) plus a custom `aws_resource_type` frontmatter field — together
  these populate `ArchNode.aws`.
- **Icons**: `node.icon` falls back to `findAwsIcon(frontmatter.type)` when a concept omits an
  explicit `icon` field, so bundle authors don't need to know our exact icon filenames for AWS
  services (`type: AWS Lambda Function` resolves fine — `findAwsIcon`'s substring fallback matches
  "Function"-suffixed type strings against the "AWS Lambda" manifest entry). Person/external-system
  concepts still need an explicit `icon: user.svg` / `icon: generic-application.svg`, since those
  aren't in the AWS service manifest.
- **Ownership & links** come from a plain `owner:` frontmatter field (team/squad name) plus a
  `# Links` section (`- [Label](https://...)`, absolute URLs only — relative `.md` links belong in
  `# Relations` instead and are silently skipped here) — together these populate `ArchNode.owner`/
  `ArchNode.links`, rendered by `DetailsPanel`'s "Ownership & Links" section.
- Frontmatter is parsed by our own minimal `parseFrontmatter` (`src/lib/frontmatter.ts`) — a
  hand-rolled subset covering flat scalars, inline `[a, b]` lists, and block `- item` lists, not a
  full YAML parser. This is deliberate: it only ever needs to read bundles we author ourselves, and
  it avoids pulling in a YAML library whose Node-oriented internals might not be browser-bundle-safe.
- **File access is injectable**: `importOkfBundle`'s second parameter (`io: OkfIo`, default a
  `fetch`-based implementation) is how the same parsing logic runs both in the browser
  (`data-sources.ts`, no build step or server route involved) and in `scripts/validate-model.ts`
  (a plain Node CLI run via `tsx`, using an `fs`-based `OkfIo` that maps the bundle's logical
  `/okf-bundles/...` root onto the filesystem's `public/` directory). Don't add browser-only APIs
  (e.g. `fetch` calls) anywhere in `okf-import.ts` outside the default `browserIo` — that's what
  would break the CLI path.
- **Boundary override**: the bundle root `index.md` frontmatter may set `boundary: false` (disable
  the boundary box entirely) or `boundary_label` + optional `boundary_icon` (custom label/icon,
  same `ArchModel.boundary` shape described in "AWS visual style" above). Omit both for the
  default "AWS Cloud" box. `boundary: false` relies on `parseFrontmatter` coercing the literal
  string `false` to a boolean — no special-casing needed in the importer beyond reading the field.

`public/okf-bundles/order-system/` is a complete, working example bundle (context → container →
component hierarchy, all 3 relation kinds, one nested region/VPC/AZ/subnet group) — read it
alongside `okf-import.ts` before changing the conventions above, and keep both in sync if you do.
`public/okf-bundles/webapp/` is a second example bundle, for a non-AWS frontend dataset (React
screens, Redux slices, service clients) — demonstrates the `boundary_label`/`boundary_icon`
override and that `aws_resource_type`/`# Schema` work fine for non-AWS resource kinds too (e.g.
`aws_resource_type: Redux Slice`).

### Browsing raw OKF docs (`src/components/SidePanel.tsx`, `OkfWikiViewer.tsx`)

`okf-import.ts` extracts structured data for the diagram; `OkfWikiViewer` is a completely separate
concern that renders a bundle's actual markdown files for *reading*, via
[`marked`](https://www.npmjs.com/package/marked) — the same library OKF's own reference viewer
(`viz.html` in the real bundles) uses. It lives inside `SidePanel`, the right-hand sidebar's
"Resource" / "Wiki" tab switcher (replacing the `DetailsPanel` config view when the "Wiki" tab is
active) — not a full-page mode, so the diagram stays visible and interactive while browsing docs.
The "Wiki" tab is disabled unless the active `DataSource` has `okfBasePath` set (plain JSON
sources have no markdown to browse); `SidePanel` derives the *effective* tab as `activeTab ===
"wiki" && wikiAvailable ? "wiki" : "resource"` so switching to a source without a bundle can't
leave the UI stuck showing a dead Wiki tab.

The Wiki tab always shows the doc page matching whatever the diagram currently has in focus —
`selectedNodeId` if a resource is selected, else `currentParentId` (the drilled-into container),
else the bundle root `index.md`. Unlike the DetailsPanel it's replacing, this isn't computed once
on a mode-switch click: `ArchVizApp` derives `wikiEntryPath` from `selectedNodeId`/`currentParentId`
on every render, so the Wiki tab's content **tracks the diagram selection live** even while the
tab is already open — click a different node with Wiki open and its doc swaps in immediately, no
need to re-click the tab. `wikiEntryPath` is passed down as both the `initialPath` prop *and* the
`key` on `OkfWikiViewer`; that `key` is what lets the component reset its own in-viewer navigation
history on a fresh jump without needing an effect to do it (same
`react-hooks/set-state-in-effect`-driven design as `data-sources.ts`: the fetch effect only calls
setState from inside its `.then`/`.catch`, and `html`/`meta`/`error` are derived by comparing the
loaded page's path against the current one, not reset directly). Which tab is active is itself a
URL param (`?panel=wiki`, omitted for the default "resource" tab) via the same `updateUrl` helper
everything else in `ArchVizApp` uses — so a Wiki-tab deep link is shareable too.

`SidePanel` widens from the default 320px to ~520px (`.side-panel--wiki` in `globals.css`) only
while the Wiki tab is active, since markdown needs more breathing room than the key/value config
list the Resource tab shows — don't remove that width bump without checking prose readability at
320px first.

Inside the viewer, clicking a relative `.md` link re-fetches and re-renders in place (intercepted
in `handleContentClick`, resolved with the same `resolveRelativePath` helper `okf-import.ts`
uses) instead of navigating away; non-`.md` and absolute/external links behave normally. Rendered
markdown is injected via `dangerouslySetInnerHTML` with no sanitization — acceptable only because
bundles under `public/okf-bundles/` are static files we author ourselves (same trust level as our
own JSON). **If a data source is ever pointed at an externally-hosted or user-supplied OKF
bundle, add HTML sanitization (e.g. DOMPurify) before rendering** — don't reuse this component
as-is for untrusted content.

### Rendering pipeline

`src/app/page.tsx` is a thin Server Component whose only job is wrapping
`src/components/ArchVizApp.tsx` (the actual client component, `"use client"`) in a
`<Suspense>` boundary — required because `ArchVizApp` reads navigation state via
`useSearchParams()` (see "Deep links, search & path highlight" below), which Next.js
requires a Suspense boundary above in production builds. `ArchVizApp` derives
`currentParentId` (which node we've drilled into, `null` = root Context view) and
`selectedNodeId` (which node's config is shown in the details panel) from the URL, not
`useState` — see below. Everything else derives from those two ids via the helpers in
`src/lib/model.ts`.

- **`ArchitectureGraph`** (`src/components/ArchitectureGraph.tsx`) owns the AntV X6 `Graph`
  instance. X6 is imperative, not declarative, so this component: creates the `Graph` once in
  a `useEffect` keyed on mount/unmount, then on every data change rebuilds the full cell list
  and commits it via `graph.resetCells(cells)` (cells built with `graph.createNode`/
  `graph.createEdge`, not added with `graph.addNode`/`graph.addEdge`). **Do not swap this back
  to `clearCells()` + `addNode`/`addEdge` in a loop** — that sequence was tried first and left
  stale cells from the previous view rendered on top of the new ones (model-level clear
  succeeded but the view layer didn't reconcile in time), most visible as leftover edge labels
  from the prior drill level bleeding into the next. `resetCells` replaces atomically and does
  not have this problem.
  Every call to `graph.zoomToFit(...)` (there are two: once after `resetCells` in the rebuild
  effect, once in a `resize` listener registered at graph creation — see below) is guarded
  behind a non-empty-cells check and a non-zero container-size check, then wrapped in a
  `try/catch`. X6's `zoomToFit` divides by the content area and by the container's current
  size internally; with zero cells (e.g. a deep link straight to a leaf node with no children)
  or a momentarily zero-size container (a transient layout frame while a flex sibling's width
  is changing — see the sidebar width bump in "Browsing raw OKF docs" below) that division
  produces a non-finite scale, which throws when applied to the underlying SVGMatrix
  (`Failed to set the 'e' property on 'SVGMatrix': The provided double value is non-finite`,
  a real, reproduced crash) — **don't remove these guards** even though they look like dead
  defensive code in the common case.
  Node click selects; node double-click drills in (only if `isDrillable`, i.e. the node has
  children per `hasChildren`).
  Layout is computed by `computeLayeredPositions` (`src/lib/layout.ts`): nodes are placed
  left-to-right by topological layer (longest path from a node with no incoming edges among the
  *currently visible* relations, exposed as `layer` on each position), not by array index.
  A node fed by both a short path and a much longer one (common in saga/orchestration graphs,
  e.g. a step invoked directly *and* reached again at the end of a long async chain) still gets
  placed at its longest-path layer, which can leave a short edge spanning many columns. Rather
  than let the `manhattan` router try to thread that straight through whatever sits in between,
  `ArchitectureGraph` detects edges whose source/target layers differ by more than 1 and gives
  them explicit `vertices` routing through a detour lane below all the content (`DETOUR_MARGIN`/
  `DETOUR_LANE_GAP`); the AWS Cloud boundary's height is computed to include that lane so
  detoured edges stay inside it. **Don't remove this detour logic** without re-checking a
  many-step saga/orchestration dataset — that's exactly the case it fixes.
  Within one layer, `computeLayeredPositions` wraps nodes into a grid capped at
  `maxRowsPerLayer` (default 6) sub-columns wide, rather than stacking every same-layer node
  in one ever-taller column — a container/cluster view with dozens of siblings in the same
  layer used to render as a single column many screens tall. `layer` itself (what the detour
  check above compares) stays the pure topological value; only the x/y placement within that
  layer changes. Separately, a node with **no incoming edges** has no predecessor constraint,
  so it's pulled down to sit just one layer above its nearest successor instead of always
  parking at layer 0 — safe because the new layer is still guaranteed less than every
  successor's layer, so this can never create a backward-pointing edge. Nodes with at least
  one incoming edge are untouched (already at the tightest valid layer). Both changes are
  covered by `src/lib/layout.test.ts`.
  Edges are drawn at a *lower* `zIndex` than nodes (nodes: 2, edges: 1, boundary: -1) so that if
  a routed edge still happens to pass under a node, clicks on that node aren't intercepted by
  the edge sitting on top of it — this was a real, reproducible bug (`elementFromPoint` returned
  the edge's `<path>`, not the node) before the ordering was fixed.
  X6 text elements default to being centered on the node's bounding box unless you give them
  explicit `refX`/`refY` (not plain `x`/`y` — those get silently overridden by the auto-center
  transform). All label/sublabel/badge attrs in the `arch-node`/`arch-boundary` shapes rely on
  `refX`/`refY` for this reason.
  Also watch `textWrap.height` on those same labels: X6 computes
  `maxLines = floor(height / lineHeight)` with `lineHeight = ceil(fontSize * 1.4)`, and if
  `height` ends up smaller than one `lineHeight` the label silently renders as `""` — a node
  name just disappears — instead of truncating with an ellipsis. `LABEL_WRAP_HEIGHT` /
  `SUBLABEL_WRAP_HEIGHT` in `ArchitectureGraph.tsx` are sized with margin above that threshold;
  keep new font sizes comfortably below `height / 1.4` too.
  Export (PNG/SVG download buttons) and the minimap use X6's built-in `Export`/`MiniMap`
  classes, imported straight from `@antv/x6` and registered via `graph.use(new Export())` /
  `graph.use(new MiniMap({ container, ... }))`. **Don't install the separate
  `@antv/x6-plugin-export`/`@antv/x6-plugin-minimap` npm packages** — as of X6 v3 those are
  deprecated empty stub releases (their `peerDependencies` still pin `@antv/x6@^2.x` anyway);
  the plugins were folded into the `@antv/x6` core package itself (`export * from './plugin'`
  in its entry point) and that's the only place to import them from now. The minimap's
  container `<div>` is always rendered (visibility toggled via CSS on `nodes.length >
  MINIMAP_NODE_THRESHOLD`) rather than conditionally mounted, since the `MiniMap` plugin is
  registered once at graph creation and needs a live container ref at that point.
  `autoResize: true` keeps the SVG viewport's size in sync with the container element (e.g. when
  the sidebar widens for the Wiki tab, or the window resizes) but doesn't re-fit the zoom/pan on
  its own, so a `resize` listener registered at graph creation calls `zoomToFit` again — subject
  to the same guards described above.
- **`DetailsPanel`** renders whatever node is currently selected, including its full
  `aws.properties` map. Pure presentational, no X6 dependency — just the "Resource" tab's
  content; `SidePanel` (see "Browsing raw OKF docs" below) owns the surrounding `<aside>`
  and the Resource/Wiki tab switcher around it.
- **`Breadcrumb`** renders the ancestor chain of `currentParentId` (via `getBreadcrumb`) so
  users can jump back to any ancestor level, not just one step up.
- **`ViewHeader`** renders a persistent title+description banner above the canvas — the
  drilled-into node's own `name`/`description` when `currentParentId` is set, else
  `ArchModel.title`/`description` at the root Context view (`ArchVizApp.tsx` resolves which to
  use via `findNode`, no new helper needed).
- **`RelationLegend`** is a plain absolutely-positioned HTML overlay (not an X6 cell) inside
  `.graph-area`, showing only the relation kinds actually present in the current view (via
  `getVisibleRelationKinds` in `src/lib/relation-style.ts`). It needs `pointer-events: none`
  because `ArchitectureGraph` binds `panning`/`mousewheel` to the whole container div.

### Deep links, search & path highlight (`src/components/ArchVizApp.tsx`)

Navigation state (`source`/`parent`/`node`/`panel` query params) lives **only** in the URL,
read via `useSearchParams()` — there is no `useState` mirroring it, so there's nothing to
resync: `sourceId`/`rawParentId`/`rawSelectedId`/`activeTab` are plain derived reads each
render, and `currentParentId`/`selectedNodeId` are further validated against the loaded
`archModel` (`findNode` must find the id) before use, falling back to `null`/root when a
URL id is stale or invalid. All navigation (`handleDrillInto`, `handleNavigate`, node
selection, search results, the sidebar's Resource/Wiki tab switch) goes through a single
`updateUrl(patch, push?)` helper that merges the patch into a new `URLSearchParams` and
calls `router.replace` (or `router.push` only when switching data source, so drill-in
clicks don't spam browser history). **Keep it this way** — the project already avoids
`setState`-in-effect resyncing (see "Data sources" above); adding a `useState` layer here
would reintroduce exactly that problem for four fields instead of one.

`SearchPalette` (Ctrl+K/Cmd+K, listened for in `ArchVizApp`) filters `archModel.nodes` — a
flat list, so no tree traversal — by `name`/`technology`/`aws.resourceType`, and navigates
via the same `updateUrl` path as clicking a node, so search results are deep-linkable too.

`PathModeControl` + `tracePath` (`src/lib/model.ts`) implement upstream/downstream
highlighting: `tracePath(relations, nodeId, direction, kindFilter?)` is a plain BFS over
whatever relations are currently visible (post-rollup, see "Relation kinds" below), so the
highlighted set always matches what's actually drawn. `ArchitectureGraph` applies this via
a **second, separate `useEffect`** from the data-rebuild one — it only toggles `opacity`
attrs on already-existing cells (`cell.attr("body/opacity", ...)` etc.) via
`graph.getNodes()`/`graph.getEdges()`, never `resetCells`, which stays reserved for actual
data changes. Boundary/group cells are skipped using `structuralIdsRef` (populated at the
end of the rebuild effect) since they aren't real `ArchNode`s. Edges preserve their own
base opacity (e.g. dimmed further for `aggregated` relations, see below) via a `baseOpacity`
value stashed in the edge cell's `data` at creation time, rather than assuming `1`.

### Relation kinds (`src/lib/relation-style.ts`)

`ArchRelation.kind` (`"sync" | "async-event" | "compensation"`) replaces the old binary
`stroke: "#5a6b82"` + `rel.async ? dashed : solid` scheme with distinct color+dash per kind
(gray solid / blue dashed / red dashed), each with a legend entry. `resolveRelationKind` falls
back through the legacy `async` boolean when `kind` is absent, so old data (`async: true`, no
`kind`) still resolves to `"async-event"` automatically — no JSON migration required, but note
this *did* recolor existing async edges from gray-dashed to blue-dashed (intentional, not a
regression). `ArchitectureGraph` calls `getRelationStyle(rel)` for the edge's `line` attrs;
nothing else about edge creation (vertices/detour-lane/router) changed for this.

`getRelationsForViewWithRollup` (`src/lib/model.ts`) is what `ArchVizApp` actually calls
instead of the plain `getRelationsForView` — a relation whose endpoints aren't both visible
at the current drill level gets walked up each endpoint's `parentId` chain to the nearest
visible ancestor instead of being dropped, so e.g. a component-to-component relation across
two different containers still shows up (as an edge between those containers) once you're
zoomed out past them. Multiple relations rolling up to the same `(source, target)` pair
merge into one edge with `aggregated: true` (label becomes `"N interações"` unless there's
only one) and a lower `getRelationStyle` opacity; relations already visible at the current
level pass through unchanged (same objects `getRelationsForView` would return — the rollup
function calls it internally for that part). `RelationLegend` adds a fixed extra row
whenever `hasAggregatedRelations(relations)` is true, since `aggregated` isn't a `RelationKind`
and so doesn't come out of `getVisibleRelationKinds`. Deliberately does **not** merge a
rolled-up edge with an already-visible direct edge between the same pair, even though both
can render as separate overlapping edges (see e.g. `payment-service → payment-system` in
`sample-architecture.json`, which rolls up alongside the existing direct
`webapp-system → payment-system` relation at the root Context view) — keeping the two
concepts separate was a deliberate scope call, not an oversight; if the overlap becomes a
real problem, dedicating effort to smarter edge-label collision avoidance (not just for
rollup) would be the right fix rather than special-casing this one interaction.

### AWS network-boundary groups (`src/lib/groups.ts`)

`ArchModel.groups` is a flat list of `AwsGroup` (`kind: "region" | "vpc" | "availability-zone" |
"subnet"`, nested via `parentGroupId`, mirroring the `ArchNode.parentId` pattern), and
`ArchNode.groupId` opts a container-level node into one. `computeGroupBoxes` is a pure function
that folds already-computed `LayoutPosition`s into nested bounding boxes (innermost/leaf group
first, each folding in its children's boxes) — it does **not** feed back into
`computeLayeredPositions`, so layout stays "group-agnostic": a group's member nodes can in
principle land non-contiguous post-layout, producing a box that overlaps ungrouped siblings.
There's no auto-fix for this; pick `groupId` assignments where the members are known to land in
the same layer/adjacent rows (see the 3 saga-step Lambdas in the sample data for a working
example), or accept the visual risk.

Group boxes render as `arch-group` cells only when `isAwsBoundaryView` is true (same gating as
the "AWS Cloud" boundary), with zIndex computed as `-(deepestGroupDepth + 1 - depth)`. Group ids
are **not** real `ArchNode`s (`findNode(archModel, group.id)` won't find them), so the
node-click/dblclick handlers build a `structuralIds` set (`BOUNDARY_ID` + every visible group
id) and ignore clicks on any of them — extend this set if you ever add another synthetic/
structural cell type.

**Bounded-context boxes** (`computeBoundedContextBoxes` in `groups.ts`) are a second, independent
overlay: a linguistic grouping from `ArchNode.ddd.context` rather than a network one, so a node can
be in both an AWS group *and* a bounded context at once — `groupId` stays single-valued, and BC
membership is computed separately via a `getGroupId` option `computeGroupBoxes` now takes (default
`n => n.groupId`; BC boxes pass `n => n.ddd?.context`). BC boxes render one level in front of the
boundary but behind every AWS network group (`-(maxGroupDepth + 2)` vs. the boundary's
`-(maxGroupDepth + 3)`) — when a view has no AWS groups and no BC boxes this still reduces
correctly to "boundary alone in the back" (the exact zIndex number changed from the original fixed
`-1`, but nothing else occupies that range, so stacking is unaffected). Their synthesized group ids
are prefixed `__bc__:` (see `BC_GROUP_ID_PREFIX`) to guarantee no collision with real `AwsGroup`/
`ArchNode` ids, and are added to the same `structuralIds` set. Because BC boxes are computed
independently of AWS groups and layout stays group-agnostic either way, **a BC box can legitimately
overlap an AWS group box** (e.g. a node that's both in a private subnet and a "Payments" bounded
context) — this is intentional, not a bug: it visualizes that a linguistic boundary and a network
boundary are different things that don't have to align. `BC_BOX_PADDING` is deliberately different
from `GROUP_BOX_PADDING` so the two box types' edges never land exactly on top of each other.

The 4 group icons (`aws-region-badge.svg`, `aws-vpc-badge.svg`, `aws-public-subnet-badge.svg`,
`aws-private-subnet-badge.svg`) are from the same official `Architecture-Group-Icons` folder in
the AWS package already used for `aws-cloud-badge.svg` — referenced as fixed filenames directly
in `ArchitectureGraph.tsx`'s `GROUP_STYLE` map, deliberately **not** looked up via
`findAwsIcon()`/`aws-icon-manifest.json` (that manifest is for the 305 user-authored AWS
*service* icons; group/boundary icons are a closed, structural set of 4). There is no official
icon for "Availability Zone" — its box is dashed with no icon, matching AWS's own convention.

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

### AWS visual style (`public/aws-icons/`, `src/data/aws-icon-manifest.json`)

Node icons are the official **AWS Architecture Icons** (square, category-colored SVGs — the
color is baked into each icon, e.g. Compute = orange `#ED7100`), downloaded from
`d1.awsstatic.com`. `public/aws-icons/` has **312** files total: all 305 service icons from the
package's `Architecture-Service-Icons` set (one per AWS service, 48px, kebab-case filenames like
`amazon-dynamodb.svg`), 3 general icons for non-AWS C4 elements (`user.svg` for Person,
`generic-application.svg` for external system, `aws-cloud-badge.svg` for the boundary badge), and
4 network-boundary group icons from `Architecture-Group-Icons` (`aws-region-badge.svg`,
`aws-vpc-badge.svg`, `aws-public-subnet-badge.svg`, `aws-private-subnet-badge.svg` — see
"AWS network-boundary groups" below). Only add new *AWS service* icons the same way (official AWS
package, not hand-drawn); don't recolor or restyle them, since AWS's usage guidelines require icons
to stay unmodified.

The 312 count above is AWS-sourced icons only. `public/aws-icons/` also has two small sets of
original, hand-authored icons for concepts AWS has no icon for: 6 `fe-*.svg` frontend icons (used
by the `webapp` OKF bundle for React screens/hooks/stores/etc.) and 4 `ddd-*.svg` DDD
building-block icons (`ddd-aggregate.svg`, `ddd-policy.svg`, `ddd-acl.svg`, `ddd-read-model.svg`,
for Aggregate Root/Domain Service or Policy/Anti-Corruption Layer/Repository or read model — set
via an explicit `icon:` field, same as `fe-*.svg`). Both sets follow the same original-art
convention (48×48, flat-color rounded-rect background, simple white geometric stroke) and are
deliberately **not** in `aws-icon-manifest.json` or looked up via `findAwsIcon()` — that manifest
indexes only the official AWS service set. If you add more non-AWS concept icons, follow this same
precedent rather than repurposing an AWS service icon for a meaning it wasn't drawn for.

`src/data/aws-icon-manifest.json` indexes every service icon (`{ key, service, category, file }`).
Don't guess kebab-case filenames by hand — use `findAwsIcon("Amazon DynamoDB")` from
`src/lib/aws-icons.ts` (tolerant of case/spacing/punctuation) to get the right `file` value for
`node.icon`, or `listAwsIconsByCategory("Databases")` to browse a category.

A dashed "AWS Cloud" boundary box (`arch-boundary` shape) is drawn automatically whenever every
visible node is `level: "container"`, matching AWS's own diagramming recommendation to always
show the cloud/account boundary explicitly. `ArchModel.boundary` lets non-AWS datasets override
or disable this: omit the field for today's default ("AWS Cloud" + `aws-cloud-badge.svg`), set it
to `{ label, icon? }` for a custom label/icon (e.g. a frontend dataset using `{ "label": "Browser
— Loja Web (SPA)", "icon": "generic-application.svg" }`), or `false` to skip the box entirely.
`icon` is a filename under `/aws-icons`, same convention as `node.icon`. For OKF bundles the same
override is expressed as root `index.md` frontmatter (`boundary: false`, or `boundary_label` +
optional `boundary_icon`) — see "Importing OKF bundles" below.

When adding new node types or AWS resource kinds, you generally only need to touch the JSON
data and reference an icon filename (via `findAwsIcon`) under `node.icon` — the drill-down,
layout, and selection logic is level-agnostic.

### Visual pipeline UI (`src/app/pipeline/`, `src/app/api/pipeline/`)

`/pipeline` (linked from the "Pipeline" button in the main header) is a wizard
replacing the CLI-driven `okf-scan` workflow with a visual flow: edit
`repo-map.yaml`, run a scan, review results, propose/review/apply a
materialization, validate, and copy the resulting `DATA_SOURCES` snippet. It's
the one part of the app with real server-side execution — a deliberate,
scoped exception to "no backend in the MVP" (see "What this is" above) that
exists only to drive the same local git/filesystem/LLM work `okf-scan` already
does via the CLI.

The Route Handlers under `src/app/api/pipeline/` (`repo-map`, `scan`,
`materialize/propose`, `materialize/apply`, `validate`) call directly into
`scripts/okf-scan/**` — `scanRepos`/`recordScanManifest`
(`scripts/okf-scan/scan-repos.ts`) is the same freshness-check/scan
orchestration the CLI's `main()` uses, extracted so both share one
implementation rather than duplicating it. Reach `scripts/okf-scan/**` via the
`@okf-scan/*` path alias (`tsconfig.json`/`vitest.config.ts`), not relative
paths. `next.config.ts`'s `serverExternalPackages` keeps `simple-git`/
`@cdktf/hcl2json`/`@anthropic-ai/sdk` out of the route handlers' server
bundles, since all three do real Node-native work (spawning `git`, a native
HCL parser, Node HTTP streaming) that Next's bundler can mishandle.

The materialization review step (`src/components/pipeline/MaterializeReview.tsx`)
mirrors the same accept/rename/merge/drop review model
`.claude/skills/okf-scan-humanize/SKILL.md` already documents as a manual JSON
edit — `src/lib/pipeline/materialize-review.ts`'s `applyReviewAction` is a pure
reducer over a `MaterializationProposal`, applied entirely client-side; nothing
is written to disk until "Apply" calls `/api/pipeline/materialize/apply`,
which re-writes `.materialize-proposal.json` with the edited copy first (same
as a human hand-editing the file before running `--materialize apply` today).
Both the `materialize/propose` and `materialize/apply` (and the plain `scan`)
routes wrap their final manifest-recording step in its own try/catch, so a
disk-write failure after the expensive scan/LLM work still returns the
already-computed result (with a `warning` field) instead of discarding it.

Deliberately does **not** write the `DATA_SOURCES` entry into
`src/lib/data-sources.ts` automatically — the Validate step shows the same
copy-paste snippet the CLI already prints (`dataSourceSnippet` in
`src/lib/pipeline/data-source-snippet.ts`), left for the user to paste by
hand, since that file requires a dev-server reload to pick up a new dynamic
import either way. See `docs/superpowers/specs/2026-07-07-pipeline-visual-flow-design.md`
for the full design and non-goals (no multiple repo-map configs, no live
progress streaming during a scan).

## Roadmap: editable flows & wiki with AI-assisted sync

The MVP is read-only ("What this is" above). The next major expansion is manual editing —
of both the flowchart (nodes/relations) and the OKF wiki markdown — plus an AI-assisted step
that keeps the two in sync when only one side is edited by hand, without clobbering prior
manual edits on either side. This is big enough to need its own phased rollout, each phase
getting its own brainstorming spec (`docs/superpowers/specs/`) and implementation plan, the
same way the `/pipeline` wizard was built incrementally (see its own commit history / the
`propose`/`review`/`apply` pattern in `src/lib/pipeline/materialize-review.ts` — that reviewer
model, where an AI proposal is diffed against and merged with human edits, is the direct
precedent for the "AI regeneration without losing manual adjustments" requirement below).

Planned phases (order may adjust as earlier phases surface constraints):

1. **Wiki editor** *(in progress — see latest spec in `docs/superpowers/specs/`)* — make
   `OkfWikiViewer`'s markdown editable in place and add a save path back to the bundle's `.md`
   files on disk (currently 100% read-only, fetched and rendered via `marked`).
2. **Persistence/save foundation** — generalize whatever save mechanism the wiki editor phase
   establishes (write route, conflict handling, git or no) so the flow editor phase can reuse
   it rather than inventing a second one for `ArchModel` data (JSON sources and/or OKF bundle
   frontmatter+sections).
3. **Visual flow editor** — editing nodes/relations directly on the X6 canvas (add, move,
   reconnect, edit AWS/DDD properties) with save-back to the underlying source (plain JSON file,
   or OKF bundle markdown/frontmatter — two different serialization targets to reconcile).
4. **AI-assisted sync/regeneration** — when the user edits only one side (flow or wiki), detect
   what the other side is now missing/stale and propose a regeneration, merged against existing
   manual edits rather than overwriting them — conceptually an extension of the existing
   materialize-review reducer pattern to a bidirectional flow↔wiki diff instead of a one-way
   code-scan↔bundle diff.

Each phase should update this list (mark done, adjust remaining phases) as it completes, so the
roadmap doesn't drift from what's actually landed.

## Working with this user (brainstorming/visual companion)

When using the `superpowers:brainstorming` skill's visual companion in this repo: only open it
for questions that are genuinely visual (comparing mockups/layouts/diagrams side by side). Do
**not** open it for conceptual/tradeoff questions (e.g. "which of these 3 engineering approaches
do you prefer") even if dressed up with placeholder boxes — ask those directly in chat instead.
This user answers in the terminal, not by clicking in the browser tab, so a browser-only
multiple-choice flow with no chat equivalent doesn't work for them.
