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
npx tsc --noEmit -p .   # type-check only, no test runner is configured yet
```

There is no test suite yet — do not assume a `test` script exists.

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
- `ArchRelation` is source/target by node id. A relation is only shown in a given view if
  *both* endpoints are visible at that drill level (`getRelationsForView`) — relations are not
  rolled up to parent boundaries in the MVP, so a relation between two components inside
  different containers simply won't render until you're inside the right container.
- AWS-specific data lives under `node.aws = { resourceType, properties }`. Only nodes that
  represent real AWS resources have this; pure C4 "component" nodes (e.g. internal classes)
  can omit it.

`src/data/sample-architecture.json` is example data (an e-commerce platform: CloudFront → API
Gateway → Lambda → DynamoDB/SQS, plus one Lambda drilled down into its internal components).
The rest of the app has no hardcoded knowledge of specific AWS services or node ids, so any
conformant `ArchModel` works regardless of where it came from — see "Data sources" below for how
more than one is wired in.

### Data sources (`src/lib/data-sources.ts`)

`page.tsx` no longer imports `sample-architecture.json` directly. `DATA_SOURCES` is a registry of
`{ id, label, load(): Promise<ArchModel> }` entries rendered as a `<select>`
(`DataSourceSelector`) in the header; add an entry to add another architecture the user can pick,
whether it's another plain JSON file (`load: () => import("@/data/foo.json").then(m => m.default
as ArchModel)`, deferred via dynamic import so it's only fetched once selected) or an OKF bundle
(`load: () => importOkfBundle("/okf-bundles/foo")`). Every `load()` result is piped through
`validateArchModel` (`src/lib/validate-model.ts`) before it resolves — a malformed dataset (dangling
`parentId`/`groupId`/relation endpoint, id collisions, `parentId` cycles, wrong C4 level nesting)
rejects the promise instead of silently rendering an incomplete graph; the same validator runs
standalone via `npm run validate` (`scripts/validate-model.ts`) in CI.

Because loading is async (OKF bundles fetch several files), `page.tsx` tracks the *last completed*
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
  whatever text follows the link on that line (defaults to the link text if there's none), and
  the optional trailing `{kind: ...}` sets `ArchRelation.kind` (omit for `"sync"`).
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

### Browsing raw OKF docs (`src/components/OkfWikiViewer.tsx`)

`okf-import.ts` extracts structured data for the diagram; `OkfWikiViewer` is a completely separate
concern that renders a bundle's actual markdown files for *reading*, via
[`marked`](https://www.npmjs.com/package/marked) — the same library OKF's own reference viewer
(`viz.html` in the real bundles) uses. `page.tsx` toggles between the two with `ViewModeToggle`
("Diagram" / "OKF Wiki"), shown in the header next to the data-source selector; the Wiki option is
disabled unless the active `DataSource` has `okfBasePath` set (plain JSON sources have no markdown
to browse).

Clicking "OKF Wiki" always jumps to the doc page matching whatever the diagram currently has in
focus — `selectedNodeId` if a resource is selected, else `currentParentId` (the drilled-into
container), else the bundle root `index.md` — computed once in `page.tsx`'s
`handleChangeViewMode` and passed down as both the `initialPath` prop *and* the `key` on
`OkfWikiViewer`. That `key` is what lets the component reset its own in-viewer navigation
history on a fresh jump without needing an effect to do it (same
`react-hooks/set-state-in-effect`-driven design as `data-sources.ts`: the fetch effect only calls
setState from inside its `.then`/`.catch`, and `html`/`meta`/`error` are derived by comparing the
loaded page's path against the current one, not reset directly).

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
- **`DetailsPanel`** renders whatever node is currently selected, including its full
  `aws.properties` map. Pure presentational, no X6 dependency.
- **`Breadcrumb`** renders the ancestor chain of `currentParentId` (via `getBreadcrumb`) so
  users can jump back to any ancestor level, not just one step up.
- **`ViewHeader`** renders a persistent title+description banner above the canvas — the
  drilled-into node's own `name`/`description` when `currentParentId` is set, else
  `ArchModel.title`/`description` at the root Context view (`page.tsx` resolves which to use via
  `findNode`, no new helper needed).
- **`RelationLegend`** is a plain absolutely-positioned HTML overlay (not an X6 cell) inside
  `.graph-area`, showing only the relation kinds actually present in the current view (via
  `getVisibleRelationKinds` in `src/lib/relation-style.ts`). It needs `pointer-events: none`
  because `ArchitectureGraph` binds `panning`/`mousewheel` to the whole container div.

### Deep links, search & path highlight (`src/components/ArchVizApp.tsx`)

Navigation state (`source`/`parent`/`node`/`view` query params) lives **only** in the URL,
read via `useSearchParams()` — there is no `useState` mirroring it, so there's nothing to
resync: `sourceId`/`rawParentId`/`rawSelectedId`/`viewMode` are plain derived reads each
render, and `currentParentId`/`selectedNodeId` are further validated against the loaded
`archModel` (`findNode` must find the id) before use, falling back to `null`/root when a
URL id is stale or invalid. All navigation (`handleDrillInto`, `handleNavigate`, node
selection, search results, view-mode toggle) goes through a single `updateUrl(patch, push?)`
helper that merges the patch into a new `URLSearchParams` and calls `router.replace` (or
`router.push` only when switching data source, so drill-in clicks don't spam browser
history). **Keep it this way** — the project already avoids `setState`-in-effect
resyncing (see "Data sources" above); adding a `useState` layer here would reintroduce
exactly that problem for four fields instead of one.

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
the "AWS Cloud" boundary), with zIndex computed as `-(deepestGroupDepth + 1 - depth)` and the
boundary itself as `-(deepestGroupDepth + 2)` — when a view has no groups this reduces to the
boundary's original fixed `-1`, so existing group-less datasets render identically. Group ids
are **not** real `ArchNode`s (`findNode(archModel, group.id)` won't find them), so the
node-click/dblclick handlers build a `structuralIds` set (`BOUNDARY_ID` + every visible group
id) and ignore clicks on any of them — extend this set if you ever add another synthetic/
structural cell type.

The 4 group icons (`aws-region-badge.svg`, `aws-vpc-badge.svg`, `aws-public-subnet-badge.svg`,
`aws-private-subnet-badge.svg`) are from the same official `Architecture-Group-Icons` folder in
the AWS package already used for `aws-cloud-badge.svg` — referenced as fixed filenames directly
in `ArchitectureGraph.tsx`'s `GROUP_STYLE` map, deliberately **not** looked up via
`findAwsIcon()`/`aws-icon-manifest.json` (that manifest is for the 305 user-authored AWS
*service* icons; group/boundary icons are a closed, structural set of 4). There is no official
icon for "Availability Zone" — its box is dashed with no icon, matching AWS's own convention.

### AWS visual style (`public/aws-icons/`, `src/data/aws-icon-manifest.json`)

Node icons are the official **AWS Architecture Icons** (square, category-colored SVGs — the
color is baked into each icon, e.g. Compute = orange `#ED7100`), downloaded from
`d1.awsstatic.com`. `public/aws-icons/` has **312** files total: all 305 service icons from the
package's `Architecture-Service-Icons` set (one per AWS service, 48px, kebab-case filenames like
`amazon-dynamodb.svg`), 3 general icons for non-AWS C4 elements (`user.svg` for Person,
`generic-application.svg` for external system, `aws-cloud-badge.svg` for the boundary badge), and
4 network-boundary group icons from `Architecture-Group-Icons` (`aws-region-badge.svg`,
`aws-vpc-badge.svg`, `aws-public-subnet-badge.svg`, `aws-private-subnet-badge.svg` — see
"AWS network-boundary groups" below). Only add new icons the same way (official AWS package, not
hand-drawn); don't recolor or restyle them, since AWS's usage guidelines require icons to stay
unmodified.

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
