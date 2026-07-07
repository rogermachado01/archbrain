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
