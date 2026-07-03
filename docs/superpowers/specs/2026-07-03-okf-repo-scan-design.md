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

## Non-goals

This spec intentionally does not cover:
- Runtime/observability data (CloudWatch, X-Ray) as a relation source
- Automated inference of `ddd_subdomain`/`ddd_context`/`ddd_role`
- Cloning remote/private git repos (v1 assumes local checkouts)
- `terraform show -json` / state-based resolution
- Lambda languages other than Node/TypeScript
- CI automation of re-scans

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
repo-map.yaml (user-authored, maps TF resources/frontend dirs to local paths)
        │
        ▼
scan-terraform.ts ──┐
scan-lambda-repo.ts ─┼─► structured "facts" (JSON): per-concept
scan-frontend-repo.ts┘   { resourceType, schema, relations[], owner, evidence }
        │
        ▼
synthesize.ts
  - deterministic: frontmatter (type/aws_resource_type), # Schema, # Relations, groups/, owner, # Links
  - LLM call (Claude): 1-3 paragraph prose description, grounded in the facts above
        │
        ▼
public/okf-bundles/<name>/   (OKF bundle, same shape as order-system/webapp)
        │
        ▼
npm run validate   (existing validate-model.ts catches structural errors)
```

Lives at `scripts/okf-scan/` (invoked via `tsx`, same convention as
`scripts/validate-model.ts`), as a new `npm run` script (e.g. `npm run
okf-scan -- --repo-map repo-map.yaml --out public/okf-bundles/<name>`).

**Key architectural rule: scanners never call an LLM and never guess
relations.** Each scanner only emits facts with evidence (e.g. `{ kind:
"sync", target: "orders_table", evidence: "PutItemCommand + env var
ORDERS_TABLE bound in TF to aws_dynamodb_table.orders_table" }`). Only
`synthesize.ts`'s prose step touches an LLM, and only to phrase facts it's
given — never to invent topology. This keeps the generated graph trustworthy
even though the descriptions are AI-written.

## Config: `repo-map.yaml`

User-authored, explicit (not auto-detected) mapping from Terraform resource
addresses to local repo checkouts, plus a plain list of frontend repos:

```yaml
resources:
  aws_lambda_function.orders: ../orders-service
  aws_lambda_function.payments: ../payments-service
frontend:
  - ../web-storefront
terraform:
  - ../infra-terraform
```

Explicit mapping was chosen over convention-based auto-matching (e.g.
inferring from Terraform's `filename`/`source_dir` attribute) because a wrong
guess silently produces a wrong graph, whereas a missing mapping entry is a
loud, obvious gap the tool can flag and error on.

## Scanners

### `scan-terraform.ts`

Parses `.tf` files with an HCL→JSON parser (no `terraform init`, no provider
credentials, no state access required — static parsing only). For each
`resource "aws_*" "name"` block:

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

## Synthesis: `synthesize.ts`

Walks the merged facts and, per concept, writes:

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

**Regeneration is idempotent and merge-aware.** Before writing a concept
file, `synthesize.ts` reads the existing file if present and preserves any
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
  module with 2-3 resources; a minimal Lambda handler with one SDK call; a
  minimal React component with one API call) — asserting on the emitted
  facts JSON, not the final bundle, so tests don't depend on the LLM step.
- A synthesis test (`synthesize.ts` given fixed fact fixtures, LLM call
  mocked) asserting the deterministic sections of the output — frontmatter,
  `# Schema`, `# Relations`, `groups/` — match expected markdown, and that a
  second run preserves a hand-added `ddd_context` field.
- An end-to-end fixture run (small fixture repo set → generated bundle →
  `validateArchModel`) to catch integration gaps between scanners and the
  validator's expectations.

## Deferred / follow-on phases

Each of these is out of scope for this spec, not forgotten:

- **Runtime/observability data** (CloudWatch/X-Ray) as a relation-confirming
  or relation-discovering source, layered on top of the static facts here.
- **Automated DDD inference** — subdomain/context/role remain manual.
- **Remote git cloning** with private-repo auth; v1 assumes local checkouts
  only, matching how the user already works with these repos.
- **`terraform show -json`/state-based resolution** for values static HCL
  parsing can't resolve (dynamic `count`/`for_each`, remote state data
  sources) — these stay `needsReview: true` facts until this phase.
- **Lambda languages beyond Node/TypeScript** (e.g. Python Lambdas via a
  Python AST scanner).
- **CI automation** of re-scans on a schedule or on infra-repo push; v1 is a
  manually-invoked script.
