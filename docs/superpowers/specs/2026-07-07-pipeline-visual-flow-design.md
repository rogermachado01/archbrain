# Visual OKF Pipeline Flow — Design

## Problem

`fluxo.txt` (captured at the repo root) shows the real workflow used to produce the
`blog2` bundle: three separate `npm run okf-scan` CLI invocations (plain scan →
`--materialize propose` → `--materialize apply --plan ...`), each printing a summary
the developer has to read and act on by hand, plus a manual copy-paste of the printed
`DATA_SOURCES` snippet into `src/lib/data-sources.ts` at the end. The
`okf-scan-humanize` skill (`.claude/skills/okf-scan-humanize/SKILL.md`) already
formalizes the human-review discipline this requires — walk every materialization
proposal item one at a time (accept/rename/merge/drop) before applying — but it's
still a CLI + chat-driven flow: editing `repo-map.yaml` by hand, running commands, and
reading JSON proposal files directly.

The user wants this entire flow available as a visual page inside the app itself,
instead of the CLI.

## Goal

A new page where a developer can: build/edit `repo-map.yaml` visually, run a scan,
see its results, propose a materialization, review and edit every proposed item
one-by-one (mirroring `okf-scan-humanize`'s exact review model), apply it, validate
the result, and get the `DATA_SOURCES` snippet to paste in — all without touching a
terminal.

## Non-goals

- **Editing `src/lib/data-sources.ts` programmatically.** `DATA_SOURCES` is
  application source code (a static array requiring a dev-server reload to pick up a
  new dynamic import either way) — the page shows the same copy-paste snippet the CLI
  already prints, it does not write to `src/`.
- **Multiple named repo-map configs.** Today's real usage is one `repo-map.yaml` at
  the repo root reused across bundles via different `--out` paths — the editor targets
  that one file in place. Supporting several saved configs is a real but separate
  feature if it's ever needed.
- **Live step-by-step progress streaming.** The underlying scan pipeline
  (`scripts/okf-scan/index.ts`) has no intermediate progress events today — it computes
  freshness, scans, synthesizes, and prints one final summary. Adding progress
  instrumentation to `scripts/okf-scan/**` is out of scope; the page shows a spinner
  while a step's request is in flight and renders the same final summary shape the CLI
  prints.
- **Making this page part of the read-only MVP's deployed surface story.** It's a
  scoped, deliberate exception to CLAUDE.md's "no backend in the MVP" — see
  "Architecture" below — but nothing about *how* it's deployed/gated is being decided
  here; that's an infra concern, not a design one.
- **Changing anything about `scripts/okf-scan/**`'s existing behavior.** Every route
  handler is a thin wrapper calling existing exported functions unmodified. If a
  function needs a new parameter to be callable outside the CLI's `main()` (e.g. to
  avoid `process.exit`/`console.log` coupling), that's noted per-endpoint below, but
  no scanning/synthesis *logic* changes.

## Architecture

A new route, `/pipeline`, linked from a button in the main app's header (next to
`DataSourceSelector`) — a separate, full-page wizard, not integrated into the
drill-down canvas. This is the one part of the app with real server-side execution:
a set of Next.js Route Handlers under `src/app/api/pipeline/` that import directly
from `scripts/okf-scan/**` (`loadRepoMap`, `checkRepoFreshness`,
`scanTerraform`/`scanLambdaRepo`/`scanFrontendRepo`, `syncWorktree`,
`proposeMaterialization`, `applyMaterializationProposal`, `synthesize`,
`validateArchModel`) — no subprocess/CLI spawning. This is a deliberate, scoped
exception to "no editing or backend in the MVP": it exists only to drive local
developer tooling that already does real filesystem/git/LLM work today via the CLI;
the rest of the app (the visualizer, `DATA_SOURCES`) stays exactly as it is, a pure
client reading static data.

`scripts/okf-scan/**` currently isn't imported from anything under `src/`. Route
handlers will import it via relative paths (`scripts/okf-scan/index.ts`'s own
internal modules already do this to each other); if `next build`'s module resolution
needs a `tsconfig` path alias to reach outside `src/` cleanly, that's an
implementation detail to confirm during planning, not a reason to duplicate or move
the scanning code.

Each wizard step is one request/response call — no SSE/WebSocket streaming (see
"Non-goals"). A step's handler runs to completion (a real scan can take minutes) and
returns JSON; the page shows a spinner for the duration, matching the CLI's own
"nothing until the final summary" behavior.

## Wizard steps

### Step 1 — Repo-map editor

`GET /api/pipeline/repo-map` reads and parses the repo root's `repo-map.yaml` (the
existing `yaml` package + `RepoMapSchema` from `scripts/okf-scan/repo-map.ts`) and
returns it as JSON. `PUT /api/pipeline/repo-map` validates a submitted config against
that same schema and, only if valid, serializes it back to YAML and writes it —
returning validation errors (same shape `loadRepoMap` throws today) instead of
writing anything on failure.

UI: a form mirroring `RepoMapConfig`'s shape, not a raw YAML textarea:
- Optional **Terraform** section: `path` + 3 branch-mapped env files (dev/hml/prd).
- **Resources** (Lambdas): repeatable rows of `{ key, repo path, 3 branches }`.
- **Frontend**: repeatable rows of `{ repo path, 3 branches }`.
- A collapsed "raw YAML" preview (read-only, generated client-side from the form
  state) so a user can sanity-check the exact file before saving.

At least one of Terraform/Resources/Frontend must be present to save, matching the
schema's own `.refine(...)` check — surfaced as an inline form error, not a server
round-trip, when possible (the same check duplicated client-side is fine here; the
server validation via `PUT` remains the source of truth).

### Step 2 — Run

A form for the CLI flags that aren't part of `repo-map.yaml`: `env` (dev/hml/prd
select), `out` (bundle directory path, e.g. `public/okf-bundles/blog2`), `force`
(checkbox), and a collapsed "Advanced" section for the 3 concurrency flags (each
defaulted to the CLI's own defaults — git 20, scan 4, llm 6 — rarely touched).

Submitting calls `POST /api/pipeline/scan`, whose body is
`{ repoMap: RepoMapConfig, env, out, force, concurrencyGit, concurrencyScan,
concurrencyLlm }`. The handler runs the same sequence `main()` runs today, up through
`synthesize()` (not including materialize), and returns:

```ts
{ written: string[], skipped: string[],
  needsReview: { id: string, notes: string[] }[],
  failed: { id: string, error: string }[] }
```

— exactly the fields the CLI prints, rendered as a results screen: counts up top, a
list for `needsReview` (id + its notes, same as `fluxo.txt`'s output), and a list for
`failed` if non-empty.

`index.ts`'s `main()` reads `args.repoMap` from a file path and re-parses it; the
route handler instead receives the already-edited-in-Step-1 config as JSON and must
call `checkRepoFreshness`/scanners directly with that object — this is a thin
reshaping of existing logic (skip `parseArgs`/`loadRepoMap`'s file read, keep
everything downstream identical), not new scanning behavior.

### Steps 3–4 — Materialize: propose, review, apply

After a scan (or an apply) completes, a "Propose materialization" button calls
`POST /api/pipeline/materialize/propose` with the same `{ repoMap, env, out, force,
...concurrency }` shape as Step 2 (materialization needs the freshly scanned
`concepts`/`groups`/`lambdaEnvVarBindings`, so this re-runs scanning up to that point
— matching the CLI's own `--materialize propose` invocation being a separate full
command, not a continuation of a prior process). The handler wraps
`proposeMaterialization`, writes `.materialize-proposal.json` into `out` (same
side effect the CLI has), and returns the `MaterializationProposal` JSON
(`containerPlans`, `actorProposals`).

**Review UI** — mirrors `okf-scan-humanize`'s reviewed-one-item-at-a-time model,
not a bulk-accept table:

- Each `containerPlans[i]` renders as a card: the container being split, then each
  `groups[]` entry with its `contextName`, member count, and (when `promoted` is
  true) a plain-language badge — "pulled out because N other groups depend on it" —
  not just the raw boolean.
- Each `actorProposals[i]` renders as a card: `type` (Person/External System),
  `title`, `description`, and the relation label it would get wired to the bundle's
  root concept.
- Per-item actions, applied to a client-side working copy of the proposal (nothing
  written to disk until Apply):
  - **Accept** — no change.
  - **Rename** — inline edit of a group's `contextName` or an actor's `title`.
  - **Merge** (groups only, within the same container plan) — pick a surviving
    group, fold the other's `memberIds` into it, remove the redundant group, and
    rewrite the removed group's members' `idRemap` entries to point at the survivor's
    `containerId` — the exact hand-edit `okf-scan-humanize` Step 3 already describes.
  - **Drop** — removes the item from its array (a group, or an actor proposal). For
    a group, this also removes its members' `idRemap` entries, matching a proposal
    that was never emitted for that group in the first place.
  - This edit logic runs client-side against the returned JSON; no new route handler
    per action.

`POST /api/pipeline/materialize/apply` takes `{ repoMap, env, out, force,
...concurrency, proposal: MaterializationProposal }` (the edited copy). It first
writes `proposal` to `.materialize-proposal.json` (so the on-disk plan matches what
was actually applied, same as a human hand-editing the file before running
`--materialize apply` today), then re-scans, calls `applyMaterializationProposal` +
`synthesize`, and returns the same `{ written, skipped, needsReview, failed }` shape
as Step 2's results screen.

### Step 5 — Validate + snippet

A final screen, reached after either a plain Step-2 run or a Step-4 apply, offers:

- A **"Run validate"** button — `POST /api/pipeline/validate` with `{ out }`, wrapping
  the same `importOkfBundle` + `validateArchModel` check `scripts/validate-model.ts`
  runs, scoped to just the one bundle directory that was just produced (not every
  `DATA_SOURCES` entry, unlike `npm run validate`). Shows pass/fail; on failure, the
  same validation error message the CLI/`npm run validate` would print.
- A read-only code block with the exact `DATA_SOURCES` entry snippet (copy-to-clipboard
  button) — the same string `index.ts`'s `main()` already builds
  (`id`/`label` derived from `basename(out)`) — for the user to paste into
  `src/lib/data-sources.ts` by hand.

## Error handling

Every route handler wraps its work the same way `index.ts`'s `withContext` does today
(prefixing an error with what step failed: reading repo-map, git/worktree sync,
scanning a specific repo, calling the Anthropic API, writing the bundle) and returns
`{ error: string }` with a non-2xx status. The wizard renders this inline on the
current step — it does not navigate away or reset form state — so a bad repo path,
missing `ANTHROPIC_API_KEY`, or a git fetch failure can be fixed and retried without
re-filling the repo-map form. Per-concept failures the CLI already treats as
retryable-on-next-run (`summary.failed`) are surfaced as part of a *successful*
response's `failed` list, same as today — not escalated to a hard error.

## Testing

- `scripts/okf-scan/**`'s existing Vitest suite is unmodified and untouched by this
  work (route handlers call these functions, they don't change them) — no new
  coverage needed there.
- New unit tests (Vitest) for the one genuinely new piece of logic: the client-side
  proposal-editing reducer (accept/rename/merge/drop), covering: merge correctly
  reassigns `idRemap` entries; drop-a-group removes its members' `idRemap` entries;
  merge/drop are confined to groups within the same container plan.
- No new automated coverage for the page's React components, consistent with this
  repo's existing convention (`src/components/**` verified manually in a browser) —
  manual verification: run the full flow end-to-end once against the existing
  `example/template-marketing-webapp-nextjs` repo used by today's `repo-map.yaml`,
  confirming the resulting bundle matches what an equivalent CLI run would produce.

## Deferred / follow-on

- Multiple named repo-map configs (see "Non-goals").
- Live progress streaming during a scan (see "Non-goals").
- Programmatically appending the `DATA_SOURCES` entry to `src/lib/data-sources.ts`
  instead of copy-paste — deferred because it means safely mutating application
  source from a route handler, a materially different risk profile than writing
  `repo-map.yaml`/bundle files.
