# OKF Repo-Scan Pipeline — Design

## Problem

Every OKF bundle in this project today (`public/okf-bundles/order-system/`,
`public/okf-bundles/webapp/`) is hand-authored. That doesn't scale to a real
architecture spread across multiple Terraform repos, multiple Lambda service
repos, and one or more frontend repos — someone would have to manually keep
markdown files in sync with infrastructure and code that changes independently
of this project.

This spec covers a new pipeline that scans those repos and *generates* an OKF
bundle conforming to the conventions already established in `CLAUDE.md`
("Importing OKF bundles"), so it can be dropped straight into
`DATA_SOURCES` (`src/lib/data-sources.ts`) like any hand-authored bundle.

The pipeline has to be re-run repeatedly over the application's life as the
underlying code and infrastructure keep changing — not a one-shot import —
so three concerns shape this design as much as the extraction logic itself:
avoiding wasted reprocessing of unchanged inputs, producing a bundle scoped
to the right environment (dev/hml/prd), and — because the real deployment
spans 50+ repos — doing all of the above efficiently enough that a routine
re-scan doesn't take hours.

## Non-goals

This spec intentionally does not cover:
- Runtime/observability data (CloudWatch, X-Ray) as a relation source
- Automated inference of `ddd_subdomain`/`ddd_context`/`ddd_role`
- Cloning brand-new remote/private repos the tool doesn't already have local
  access to (v1 still requires a local clone with its remote configured per
  `repo-map.yaml` entry — see "Environments" for the branch-checkout
  mechanism this enables on top of that clone)
- `terraform show -json` / state-based resolution
- Lambda languages other than Node/TypeScript
- CI automation of re-scans (though the incremental-scan design below is
  what would make that cheap enough to do later — see "Deferred")

See "Deferred / follow-on phases" at the end for why each is out of scope for
v1, not forgotten.

## Prior art considered: `okf-reference/`

The repo already vendors `okf-reference/`, a Python proof-of-concept
("reference agent") that generates OKF bundles from a `Source` (currently only
BigQuery) plus an LLM web-crawl enrichment pass. It was evaluated as a base
for this work and rejected for the code-scanning use case specifically:

- Its `Source` ABC (`list_concepts`/`read_concept`/`sample_rows`) and
  `enrich` CLI are a clean extension point in the abstract, but the actual
  extraction work here — parsing Terraform HCL, walking a TypeScript AST for
  handler exports and AWS SDK calls, walking a React component tree — is
  Node/TypeScript-native work. Doing it from Python would mean either a
  TS-parsing library in Python (poor support) or shelling out to Node anyway,
  at which point the Python layer adds indirection without adding value.
- Its `reference_instruction.md` prompt and synthesizer only know generic OKF
  fields (`type`, `title`, `description`, `resource`, `tags`, `# Schema`,
  `# Citations`). It has no knowledge of this project's AWS/DDD conventions
  (`aws_resource_type`, `ddd_*`, `# Relations` with `kind`/`pattern`,
  `# Links`, `owner`, `groups/`, `boundary`) — that prompt would need to be
  substantially rewritten regardless of which language houses the pipeline.
- archviz already owns the OKF conventions, the validator
  (`scripts/validate-model.ts`), and the TypeScript types the output must
  conform to. Building the generator natively in archviz means it can import
  `ArchModel`/`AwsGroup`/etc. types directly and reuse `validateArchModel`
  as-is, instead of re-deriving the schema in Python and keeping two
  implementations in sync.

Conclusion: **no changes are needed to `okf-reference/`.** It stays as
reference material for the OKF format itself (and its BigQuery source remains
useful if a future dataset-shaped source is ever added). The new capability
is a standalone TypeScript tool inside this repo.

## Architecture

```
repo-map.yaml (maps TF resources/frontend dirs to local paths + per-env branch/file)
        │
        ▼ --env dev|hml|prd
check-repo-freshness.ts   (parallel git ls-remote / file-hash per repo vs manifest → changed-repo set)
        │
        ▼  (only repos in the changed set proceed)
resolve-worktrees.ts (git worktree add/checkout the right branch, changed repos only, parallel)
        │
        ▼
scan-terraform.ts ──┐   (reads dev.tf/hml.tf/prd.tf per --env)
scan-lambda-repo.ts ─┼─► structured "facts" (JSON): per-concept, parallel across changed repos
scan-frontend-repo.ts┘   { resourceType, schema, relations[], owner, evidence }
        │
        ▼  (facts for unchanged repos reused from the manifest's cached facts)
synthesize.ts
  - hash each concept's inputs, compare to .scan-manifest.json → skip unchanged concepts entirely
  - deterministic: frontmatter (type/aws_resource_type), # Schema, # Relations, groups/, owner, # Links
  - LLM call (Claude): 1-3 paragraph prose description, grounded in the facts above (changed concepts only, parallel with a low cap)
        │
        ▼
public/okf-bundles/<name>-<env>/   (OKF bundle + .scan-manifest.json, committed together)
        │
        ▼
npm run validate   (existing validate-model.ts catches structural errors)
```

Lives at `scripts/okf-scan/` (invoked via `tsx`, same convention as
`scripts/validate-model.ts`), as a new `npm run` script, one run per
environment:

```
npm run okf-scan -- --repo-map repo-map.yaml --env dev --out public/okf-bundles/ecommerce-dev
```

**Key architectural rule: scanners never call an LLM and never guess
relations.** Each scanner only emits facts with evidence (e.g. `{ kind:
"sync", target: "orders_table", evidence: "PutItemCommand + env var
ORDERS_TABLE bound in TF to aws_dynamodb_table.orders_table" }`). Only
`synthesize.ts`'s prose step touches an LLM, and only to phrase facts it's
given — never to invent topology. This keeps the generated graph trustworthy
even though the descriptions are AI-written.

## Config: `repo-map.yaml`

User-authored, explicit (not auto-detected) mapping from Terraform resource
addresses to local repo checkouts, plus per-environment branch/file info:

```yaml
terraform:
  path: ../infra-terraform      # local clone; scanned in place, no worktree needed
  envFiles:                     # env is expressed as a file within the same repo
    dev: dev.tf
    hml: hml.tf
    prd: prd.tf

resources:
  aws_lambda_function.orders:
    repo: ../orders-service     # local clone with the remote already configured
    branch:                     # env is expressed as a branch
      dev: develop
      hml: staging
      prd: main
  aws_lambda_function.payments:
    repo: ../payments-service
    branch: { dev: develop, hml: staging, prd: main }

frontend:
  - repo: ../web-storefront
    branch: { dev: develop, hml: staging, prd: main }
```

Explicit mapping was chosen over convention-based auto-matching (e.g.
inferring from Terraform's `filename`/`source_dir` attribute) because a wrong
guess silently produces a wrong graph, whereas a missing mapping entry is a
loud, obvious gap the tool can flag and error on. The same reasoning applies
to environments: Terraform resolves an environment to a *file* within the
same checkout (`dev.tf`/`hml.tf`/`prd.tf`, alongside whatever shared `.tf`
files apply to all environments), while Lambda and frontend repos resolve an
environment to a *branch* — both conventions are declared explicitly per
repo rather than guessed, since the two repo kinds genuinely differ in how
they encode environment today.

## Environments & worktrees

Every scan run targets exactly one environment (`--env dev|hml|prd`), which
resolves differently per repo kind:

- **Terraform**: the scanner reads the shared `.tf` files plus whichever
  env-specific file `repo-map.yaml` names for `--env` (e.g. `dev.tf`) — no
  branch switching needed, since environment is file-scoped within one
  checkout.
- **Lambda/frontend repos**: environment is branch-scoped, so before
  scanning, `resolve-worktrees.ts` runs `git fetch` against the repo path
  from `repo-map.yaml`, then `git worktree add` (or reuses/updates an
  existing one) at a local, gitignored path —
  `.okf-scan-cache/worktrees/<repo-name>-<env>/` — checked out to that
  environment's branch. **The path the user configured in `repo-map.yaml` is
  only ever read for its `.git` metadata and fetched from; it is never
  checked out, written to, or otherwise disturbed**, so a scan run never
  collides with in-progress work in the developer's own checkout. Scanners
  then read source files from the worktree path, not the configured repo
  path.

Each environment therefore produces its own bundle
(`public/okf-bundles/<name>-<env>/`), registered as its own `DATA_SOURCES`
entry (e.g. `{ id: "ecommerce-dev", label: "E-commerce (dev)" }`) — this
follows directly from environments genuinely having different resource
configurations (names, sizes, even topology), not just different data, so
merging them into one `ArchModel` would misrepresent what's actually
deployed where.

## Scaling to 50+ repos: repo-level short-circuit & parallelism

At real scale (50+ repos), fetching + checking out a worktree + AST-parsing
every repo on every run would dominate wall-clock time even though the
existing concept-level incremental check (see "Incremental scanning" below)
still saves the LLM cost. Most repos, on most runs, haven't changed at all —
so the design adds a cheaper check *before* any of that expensive work runs.

**`check-repo-freshness.ts` runs first, before `resolve-worktrees.ts`,**
against every repo in `repo-map.yaml` in parallel:

- Branch-based repos (Lambda/frontend): `git ls-remote <repo> <branch>` —
  no clone, no worktree, just asks the remote for the branch's current
  commit SHA.
- Terraform: a content hash of the shared `.tf` files plus the `--env`-
  selected env file.

Each result is compared against a **per-repo** entry now also tracked in
`.scan-manifest.json` (alongside the existing per-concept entries):

```json
{
  "_repos": {
    "orders-service":   { "lastScannedRef": "a1b2c3d (develop)", "env": "dev" },
    "infra-terraform":  { "lastScannedRef": "sha256:9f8e7d..." }
  },
  "orders-service/handler": { "inputHash": "...", "lastScannedAt": "..." }
}
```

**A repo whose ref/hash is unchanged is dropped from this run entirely** —
no worktree sync, no parsing. Its concepts' facts are reused as-is from the
previous run (cached in the manifest alongside the input hash — see
"Incremental scanning"), so `synthesize.ts` still sees a complete fact set
for every concept without having rescanned most of them. Only repos whose
ref/hash changed proceed to `resolve-worktrees.ts` and the scanners.

**Parallelism, capped per bottleneck type** rather than one global
concurrency number, since each stage is bound by a different resource:

| Stage                                    | Bottleneck    | Default cap | Flag                  |
|-------------------------------------------|---------------|-------------:|-----------------------|
| `check-repo-freshness.ts` (`ls-remote`)    | network        | 20           | `--concurrency-git`   |
| `resolve-worktrees.ts` + AST scanning       | CPU            | # of cores   | `--concurrency-scan`  |
| `synthesize.ts` LLM prose calls             | API rate limit | 6            | `--concurrency-llm`   |

The LLM stage additionally retries on `429`/rate-limit responses with
exponential backoff, since even a capped concurrency can still occasionally
hit a provider-side limit under load.

Net effect at 50+ repos: a routine re-scan where only a handful of repos
changed since last run does ~50 fast `ls-remote` calls (parallel, seconds
total), then does real work only for the changed subset — turning "hours"
into a runtime proportional to *what changed*, not to the total repo count.

## Scanners

### `scan-terraform.ts`

Parses `.tf` files with an HCL→JSON parser (no `terraform init`, no provider
credentials, no state access required — static parsing only), reading the
shared files plus the `--env`-selected file per "Environments & worktrees"
above. For each `resource "aws_*" "name"` block:

- Maps the Terraform resource type to this project's `aws_resource_type`
  vocabulary via a lookup table (`aws_lambda_function` → `AWS Lambda
  Function`, `aws_dynamodb_table` → `Amazon DynamoDB Table`, etc. — the same
  vocabulary `findAwsIcon` already resolves against
  `aws-icon-manifest.json`).
- `# Schema` is built from the resource's own arguments (memory size,
  runtime, billing mode, etc.).
- Relations come from interpolation references between resources (e.g.
  `aws_dynamodb_table.orders_table.arn` appearing inside
  `aws_lambda_function.orders`'s `environment.variables`) and explicit
  `depends_on`.
- `aws_vpc`/`aws_subnet` blocks (availability zone read from the subnet's
  `availability_zone` attribute) become `ArchModel.groups` entries, per the
  "AWS network-boundary groups" conventions already in `src/lib/groups.ts`.
- Each Lambda resource's `environment.variables` map is retained in the facts
  output (e.g. `ORDERS_TABLE → aws_dynamodb_table.orders_table`) — this is
  what lets the Lambda scanner resolve `process.env.ORDERS_TABLE` back to a
  real resource id.
- A reference/value the parser cannot resolve statically (dynamic
  `count`/`for_each` indices, remote state data sources) is emitted as a fact
  with `needsReview: true` rather than dropped or guessed at.

### `scan-lambda-repo.ts`

One instance per repo listed in `repo-map.yaml`, using the TypeScript
Compiler API:

- Finds the exported handler(s) (`export const handler = ...` /
  `exports.handler`) — these become component-level child nodes under the
  container node the repo is mapped to (matching the "internal Lambda
  components" pattern already demonstrated by `sample-architecture.json`'s
  drilled-down Lambda).
- Walks the handler's call graph (one hop into local function calls) for AWS
  SDK v3 client calls (`new DynamoDBClient()`, `.send(new
  PutItemCommand(...))`, etc.) — each becomes a relation fact. The
  `TableName`/`QueueUrl`/etc. argument is resolved either as a literal string
  or, when it's `process.env.X`, against that Lambda's Terraform
  `environment.variables` map (from `scan-terraform.ts`'s output) back to a
  concrete target resource id.
- Relation `kind` defaults to `"sync"`; SQS/SNS/EventBridge client calls map
  to `"async-event"`, matching `ArchRelation.kind`.
- A call the scanner can't resolve (dynamic table name, unrecognized SDK
  client) is emitted as a low-confidence fact with `needsReview: true`
  instead of being silently dropped or guessed — `synthesize.ts` collects
  these into the run's summary output so a human can hand-fix them
  afterward.

### `scan-frontend-repo.ts`

Same TS Compiler API approach, mirroring the conventions already established
by the hand-authored `public/okf-bundles/webapp/` bundle: React
components/screens become component nodes, `fetch`/API-client calls with a
resolvable base URL become relations to the matching API Gateway/backend
container, Redux slices/stores become their own component nodes
(`aws_resource_type: Redux Slice`, same precedent as the existing webapp
bundle).

### Ownership

A `CODEOWNERS` file at each repo's root maps path patterns to team names,
attached to each concept scanned from that repo as its `owner` field.

## Incremental scanning

`public/okf-bundles/<name>-<env>/.scan-manifest.json` is committed alongside
the bundle. Besides the per-repo `_repos` entries used by the freshness
check above, it stores one entry per concept with **both** a hash of that
concept's *inputs* (source file(s) plus whatever Terraform facts feed it,
e.g. an env-var-to-resource binding) **and the facts themselves**, so a
concept from a repo the freshness check skipped still has something for
`synthesize.ts` to read without having been rescanned this run:

```json
{
  "orders-service/handler": {
    "inputHash": "a1b2c3...",
    "facts": { "resourceType": "AWS Lambda Function", "relations": [ /* ... */ ] },
    "lastScannedAt": "2026-07-03T10:00:00Z"
  }
}
```

For repos the freshness check flagged as changed, scanners run and produce
fresh facts for every concept in that repo. For repos it skipped, that
repo's concepts' facts are read straight from the manifest instead — either
way, `synthesize.ts` ends up with a complete fact set for every concept in
the bundle. It then hashes each concept's (fresh-or-cached) facts and
compares against the manifest entry. **Unchanged concepts are skipped
entirely — no LLM call, and the existing `.md` file is left byte-for-byte
untouched** (not rewritten with identical content), so a `git diff` after a
scan shows exactly, and only, what actually changed. This is the primary
cost/time saver for concepts within a repo that did change, layered on top
of the repo-level short-circuit that avoids rescanning repos that didn't.

A `--force` flag bypasses the manifest and freshness check entirely,
rescanning every repo and regenerating every concept — needed after a
prompt or synthesis-logic change, where the *inputs* didn't change but the
desired *output* did.

## Synthesis: `synthesize.ts`

Walks the merged facts and, per concept not skipped by the incremental-scan
check above, writes:

- Deterministic frontmatter: `type`, `aws_resource_type`, `owner`.
  `title`/`icon` derived via the existing `findAwsIcon` lookup.
- Deterministic `# Schema` and `# Relations` sections built straight from
  facts, including `{kind: ...}` tags.
- `groups/` subtree from Terraform's VPC/subnet/region facts.
- One LLM (Claude) call per concept for the prose description paragraph(s),
  grounded only in that concept's own facts (not the whole bundle) — the
  same one-concept-at-a-time shape `okf-reference`'s
  `reference_instruction.md` already uses, kept narrow to stay cheap and
  avoid hallucinated cross-links.

**`ddd_subdomain`/`ddd_context`/`ddd_role` are deliberately never written by
this pipeline.** They're a linguistic/business classification, not something
derivable from code or Terraform — they stay a manual curation step, same as
today.

**Regeneration is merge-aware, not overwrite-and-lose.** For a concept whose
input hash *did* change (so it isn't skipped by "Incremental scanning"
above), `synthesize.ts` reads the existing file first and preserves any
`ddd_*` frontmatter and any hand-edited `# Links` entries, while replacing
the deterministic sections (frontmatter type/schema/relations, prose) with
freshly-scanned data. This means a re-scan after an infra change doesn't
throw away DDD annotation work already done by hand — the same "refine
rather than rewrite" spirit `okf-reference`'s own prompt documents, done here
deterministically (file diffing) rather than via LLM judgment.

**Validation**: the pipeline ends by invoking the existing
`validateArchModel` path (the same one `npm run validate` runs) — a
malformed scan output fails the run exactly like a malformed hand-authored
bundle would today.

## Testing

- Unit tests per scanner against small fixture repos (a minimal Terraform
  module with 2-3 resources across `dev.tf`/`hml.tf`; a minimal Lambda
  handler with one SDK call; a minimal React component with one API call) —
  asserting on the emitted facts JSON, not the final bundle, so tests don't
  depend on the LLM step.
- A synthesis test (`synthesize.ts` given fixed fact fixtures, LLM call
  mocked) asserting the deterministic sections of the output — frontmatter,
  `# Schema`, `# Relations`, `groups/` — match expected markdown, and that a
  second run preserves a hand-added `ddd_context` field.
- An incremental-scan test: run synthesis twice against unchanged fixture
  facts and assert the second run makes zero LLM calls and leaves every
  `.md` file's mtime/content untouched; then change one fixture's facts and
  assert only that one concept's file and manifest entry updated.
- A repo-freshness test: given a manifest with a stale ref for one repo out
  of several fixture repos, assert `check-repo-freshness.ts` returns exactly
  that one repo as changed, and that a full run only invokes
  `resolve-worktrees.ts`/scanners for it, reusing cached facts for the rest.
- A worktree-resolution test against a local throwaway git fixture repo with
  two branches, asserting `resolve-worktrees.ts` checks out the right branch
  per environment into the cache path and never touches the configured repo
  path's current branch/working tree.
- A concurrency-cap test asserting no more than `--concurrency-git` /
  `--concurrency-llm` operations of each kind run at once against a fixture
  set larger than the cap, and that a simulated LLM 429 response is retried
  rather than failing the whole run.
- An end-to-end fixture run (small fixture repo set → generated bundle →
  `validateArchModel`) to catch integration gaps between scanners and the
  validator's expectations.

## Deferred / follow-on phases

Each of these is out of scope for this spec, not forgotten:

- **Runtime/observability data** (CloudWatch/X-Ray) as a relation-confirming
  or relation-discovering source, layered on top of the static facts here.
- **Automated DDD inference** — subdomain/context/role remain manual.
- **Cloning brand-new remote/private repos** the tool doesn't already have a
  local, remote-configured clone of; v1's worktree mechanism (see
  "Environments & worktrees") only fetches/checks-out branches within a
  clone the user already has, it doesn't perform an initial `git clone` with
  credential handling.
- **`terraform show -json`/state-based resolution** for values static HCL
  parsing can't resolve (dynamic `count`/`for_each`, remote state data
  sources) — these stay `needsReview: true` facts until this phase.
- **Lambda languages beyond Node/TypeScript** (e.g. Python Lambdas via a
  Python AST scanner).
- **CI automation** of re-scans on a schedule or on infra-repo push; v1 is a
  manually-invoked script, though the incremental-scan manifest is what
  would make a scheduled/triggered CI run cheap enough to be worth doing.
