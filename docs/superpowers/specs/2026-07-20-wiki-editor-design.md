# OKF Wiki Editor — Design

## Problem

`OkfWikiViewer` (`src/components/SidePanel.tsx`'s "Wiki" tab) is 100% read-only: it fetches
a bundle's markdown files client-side and renders them via `marked`. There is no way to fix
a typo, update a description, or adjust a `# Schema`/`# Relations` section without leaving
the app and hand-editing files under `public/okf-bundles/` in an external editor.

This is phase 1 of a larger roadmap (see CLAUDE.md's "Roadmap: editable flows & wiki with
AI-assisted sync") toward manual editing of both the wiki and the flowchart, plus an
AI-assisted step that keeps the two in sync. This phase is scoped to the wiki side only.

## Goal

From the Wiki tab, a user can switch a page into an edit mode, change its raw markdown
(frontmatter + body, including the `# Schema`/`# Relations`/`# Links` sections that feed
the diagram), save it back to disk, and see the diagram canvas reflect the change (title,
AWS properties, edges) without a manual page reload.

## Non-goals

- **Creating new pages/nodes.** Editing is scoped to `.md` files that already exist in the
  bundle. Creating a new page means creating a file, wiring it into an `index.md` listing,
  and deciding whether/how it becomes a new `ArchNode` — that overlaps with the flow-editor
  phase's "create a node" work and is deferred to it, to avoid building the same capability
  twice with two different entry points.
- **A structured/WYSIWYG editor.** The textarea edits the exact raw file text (frontmatter
  and body together) as one string. No form fields for individual frontmatter keys, no rich
  body editor, no separate editors for the `# Schema`/`# Relations`/`# Links` sections. This
  is deliberately the simplest option: it can't lose or mangle anything the project's
  hand-rolled `parseFrontmatter` (`src/lib/frontmatter.ts`) doesn't fully round-trip, because
  nothing is ever reconstructed from parsed pieces — the saved text is exactly what the user
  typed.
- **Multi-user conflict handling.** This is a local, single-developer tool (same trust/usage
  model as the rest of the app and the `/pipeline` wizard). Two browser tabs editing the same
  file concurrently is last-write-wins, unhandled — an accepted risk, not a gap to close here.
  The bundle lives in git, so the worst case is recoverable.
- **Editing plain-JSON data sources.** Only `DataSource` entries with `okfBasePath` set have
  a Wiki tab at all (`wikiAvailable` gating already existing in `SidePanel`); this feature
  only ever touches OKF bundle `.md` files.

## Architecture

Following the same precedent as `/pipeline` (see its design doc's "Architecture" section):
this is another small, deliberate, scoped exception to CLAUDE.md's "no editing or backend in
the MVP" — one new Route Handler that does real filesystem work, thin enough to just validate
and write, with the actual "is this edit safe to write" logic in a plain testable function
under `src/lib/`, not inline in the route.

### `src/lib/wiki/save.ts` (new)

The one genuinely new piece of logic, unit-tested directly (no route/HTTP involved):

```ts
interface SaveWikiPageResult {
  ok: true;
} | {
  ok: false;
  error: string;
}

async function saveWikiPage(
  basePath: string,   // e.g. "/okf-bundles/order-system"
  relPath: string,    // e.g. "order-system/order-processor.md"
  content: string,    // full raw new file text, as typed by the user
  io: WikiSaveIo       // see below — real fs in prod, in-memory fake in tests
): Promise<SaveWikiPageResult>
```

1. **Path containment check**: resolves `basePath` + `relPath` and rejects (without touching
   `io`) if the result would land outside `basePath`'s own tree — same `path.relative`-based
   segment-aware idiom `src/app/api/pipeline/validate/route.ts`'s `toLogicalBundlePath` already
   uses (generalized to take an arbitrary `basePath` instead of a fixed `out`).
2. **Validate before writing**: builds an *overlay* `OkfIo` (`src/lib/okf-import.ts`'s existing
   interface) whose `readText(path)` returns `content` when `path === basePath + "/" + relPath`
   and otherwise delegates to `io`'s real read — so every other file in the bundle (anything
   the edited page's `# Relations` points at, or that points at it) is validated against its
   actual on-disk state, only the one edited page is simulated. Runs
   `importOkfBundle(basePath, overlayIo).then(validateArchModel)` against that overlay.
   - Validation failure → returns `{ ok: false, error }`, `io.writeText` is never called, the
     real file on disk is untouched.
3. **Write**: only on validation success, calls `io.writeText(basePath + "/" + relPath,
   content)`, returns `{ ok: true }`.

`WikiSaveIo` extends the existing `OkfIo` (`readText`/`exists`) with one more method,
`writeText(path, content): Promise<void>` — the production implementation is the same
`fsIo` pattern `validate/route.ts` already has (rooted at `public/`), with `writeText` added
as `fs.writeFile`.

### `src/app/api/wiki/save/route.ts` (new)

Thin wrapper: parses `{ basePath: string, path: string, content: string }` from the request
body, calls `saveWikiPage(basePath, path, content, fsIo)`, and returns its result as a normal
`{ ok: true }` / `{ ok: false, error }` JSON body with a 200 status either way — matching
`src/app/api/pipeline/validate/route.ts`'s own precedent (`{ valid: false, error }` at 200 for
any failure, validation or otherwise), not the `errorResponse(err, status)` non-2xx pattern the
`scan`/`materialize` routes use for actual server errors. A save failure here (validation
rejection or an unexpected disk error) is an expected, handled outcome the wizard UI renders
inline, the same way a failed validate check is — not a server-error status.

### `OkfWikiViewer.tsx` changes

- Keeps the raw fetched text (currently discarded after `parseFrontmatter` splits it into
  `data`/`content`) in state alongside the existing parsed `LoadedPage`, so entering edit mode
  needs no extra fetch.
- New local state: `editing: boolean`, `draft: string` (textarea contents), `saveError: string
  | null`, `saving: boolean`.
- Toolbar: read mode shows `← Back` / path / **Editar**. Edit mode shows **Salvar** /
  **Cancelar** / path; `← Back` and in-content `.md` link navigation
  (`handleContentClick`) are both disabled while `editing` — no `confirm()` dialog (the
  project avoids browser dialogs elsewhere too), the only way to leave edit mode is an
  explicit Salvar or Cancelar.
- **Salvar** → `POST /api/wiki/save` with `{ basePath, path, content: draft }`.
  - Success: reparses `draft` locally (`parseFrontmatter` + `marked`, same as the read-mode
    fetch effect does) to update the displayed `html`/`meta`/raw immediately, sets
    `editing = false`, and calls the new `onSaved` prop (see below) — no need to wait on a
    network round-trip to show the page's own new content.
  - Failure: sets `saveError`, stays in edit mode with `draft` untouched, so the user's edit
    isn't lost.
- **Cancelar** → discards `draft`, sets `editing = false`, no network call.
- `Ctrl/Cmd+S` while the textarea has focus triggers the same Salvar path (`preventDefault`
  to suppress the browser's own save-page shortcut).

### Diagram refresh (`ArchVizApp.tsx`, `SidePanel.tsx`)

A saved wiki edit can change data the canvas already rendered from the old `ArchModel` (a
node's title, its `aws.properties` from `# Schema`, its edges from `# Relations`). `ArchVizApp`
needs to reload the currently-selected source's model without a full page refresh:

- New `reloadNonce` state (`useState(0)`), added to the existing model-load effect's dependency
  array: `}, [sourceId, reloadNonce]);`. This doesn't change the existing "derive `archModel`
  from a stored `{sourceId, model}`, never reset synchronously in the effect" pattern (see
  CLAUDE.md's "Data sources" section) — it only adds a second reason for the effect to re-run;
  the derivation logic (`loaded.sourceId === sourceId ? loaded.model : null`) is unaffected.
- A `triggerReload = () => setReloadNonce(n => n + 1)` closure is passed down through
  `SidePanel`'s existing prop chain to `OkfWikiViewer` as `onSaved`.
- **Cache-busting**: `src/lib/okf-import.ts`'s default `browserIo.readText` calls plain
  `fetch(path)` with no options. In a production (`next start`) serve of `public/`, that risks
  the browser's HTTP cache returning the pre-edit file content on reload. Adding `{ cache:
  "no-store" }` to that one `fetch` call (scoped to `browserIo` only — the `fsIo` variants used
  by the API routes and `scripts/validate-model.ts` read straight off disk and are unaffected)
  ensures a triggered reload actually observes the just-written file.

## Error handling

| Case | Behavior |
|---|---|
| Malformed frontmatter / `# Relations` syntax in the edit | `saveWikiPage` rejects before writing; inline error in the wiki panel; draft text preserved |
| Edited `# Relations` now points at a node/link that doesn't resolve | Caught by `validateArchModel`'s existing dangling-relation-endpoint check, same path as above |
| `path` attempting to escape `basePath`/`public/` | Rejected by the containment check before any `io` call |
| Disk write failure (permissions, disk full) after validation passed | Caught in the route handler, returned as `{ ok: false, error }`, same inline error UI — no partial state since validation already fully succeeded before the write was attempted |
| Two tabs editing the same file | Unhandled, last-write-wins (see "Non-goals") |

## Testing

- **`src/lib/wiki/save.test.ts`** (Vitest, part of the normal `npx vitest run` /
  `src/lib/**` suite) against a small fixture bundle and an in-memory `WikiSaveIo` fake:
  - a valid edit writes the new content and returns `{ ok: true }`
  - invalid frontmatter/relations returns `{ ok: false, error }` and never calls `writeText`
  - a `relPath` that resolves outside `basePath` is rejected before any `io` call
  - a page referenced by another page's `# Relations` validates correctly — the overlay serves
    edited content only for the target path, real (fake-disk) content for everything else
- **`route.ts`**: no direct automated test, consistent with the existing `/api/pipeline/*`
  routes (thin wrapper around the tested lib function).
- **`OkfWikiViewer` edit mode**: no automated component test, consistent with this repo's
  existing convention for `src/components/**` (manual browser verification). Manual pass:
  edit a real page under `public/okf-bundles/order-system`, confirm the canvas picks up a
  Schema/Relations change without F5, confirm an invalid edit shows an inline error and leaves
  the on-disk file unchanged, confirm Cancelar discards, confirm Ctrl+S works, and run
  `npm run validate` afterward as a cross-check between the browser save path and the CLI's
  `fs`-based validation path.

## Deferred / follow-on

- Creating new wiki pages/nodes (see "Non-goals") — planned as part of the flow-editor phase.
- A structured/WYSIWYG editor instead of raw markdown text (see "Non-goals").
- Multi-tab conflict detection/locking (see "Non-goals").
- Generalizing `WikiSaveIo`/the validate-then-write pattern here into the shared persistence
  foundation the flow-editor phase (roadmap phase 2 in CLAUDE.md) is expected to reuse for
  `ArchModel` edits (JSON sources and/or OKF bundle frontmatter/sections), and eventually the
  AI-assisted flow↔wiki sync phase (roadmap phase 4).
