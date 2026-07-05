# Frontend Relation Scanning (Pages, Composition, Navigation) — Design

## Problem

`scan-frontend-repo.ts` (part of the `okf-scan` pipeline, see
[2026-07-03-okf-repo-scan-design.md](2026-07-03-okf-repo-scan-design.md)) only detects
one relation source: a literal `fetch(...)` call inside a component whose URL matches a
configured `apiBaseUrls` prefix. Scanning the real `template-marketing-webapp-nextjs`
repo (the `blog` OKF bundle) with this pipeline produces 74 concepts and **zero
relations** — not a bug in the detection logic itself, but a scope gap: this codebase is
a Contentful/Next.js marketing site that composes React components (`layout.tsx`
renders `Header`, `CtfFooterGql`, `CtfMobileMenuGql`, ...) rather than calling `fetch()`
directly, and `index.ts` additionally hardcodes `apiBaseUrls: {}` for every frontend
repo, so even the existing fetch-detection path is dead in practice.

Separately, Next.js pages under `src/pages/` aren't scanned as concepts at all today:
`isExportedComponent` only recognizes a direct `export const X = ...` / `export
function X() {}`, not the `const X = () => {...}; export default X;` pattern pages
conventionally use. Without pages as concepts, there is no node to represent "where the
user's flow through the app begins," even once composition relations exist.

The result: neither the diagram nor the Wiki view for this bundle shows any
relationship between components, defeating the actual purpose of an OKF-backed
architecture visualizer — mapping relationships to make the system easier to
understand.

## Goal

Give `scan-frontend-repo.ts` two new, purely static relation-detection capabilities —
**composition** (which component renders which) and **navigation** (which page links to
which) — plus the page-detection fix both capabilities depend on, so a frontend-only
bundle like `blog` shows a real, evidence-backed graph of the user's flow through the
app: page → composed components → (optionally) links to other pages.

## Non-goals

- Cross-repo relations (a frontend repo's composition/navigation scan only ever
  resolves imports to files within that same repo — matches the existing
  fetch-detection scanner's boundary).
- Detecting whether an imported component is *actually rendered* in JSX vs. merely
  imported-and-unused — out of scope (YAGNI; unused imports are rare and usually
  lint-caught upstream).
- App Router (`app/`) support — the example repo and current convention target the
  Pages Router (`pages/`) only; App Router page/layout conventions differ enough to be
  a separate follow-on if a future repo needs it.
- Wiring `apiBaseUrls` up to `repo-map.yaml` config — the existing fetch-detection path
  stays as-is (still hardcoded to `{}` in `index.ts`); not touched by this spec.
- Making the LLM infer relations beyond what the static scanner found. The existing
  architectural rule from the parent spec — "scanners never call an LLM and never guess
  relations" — is kept as-is; the LLM's new role here (see "LLM label enrichment") is
  limited to rephrasing an already-detected relation's label, never adding one.

## Page detection

A new, separate detector (kept apart from `isExportedComponent` so all 73 currently-
scanned concepts are unaffected — same file, same hash, no spurious re-synthesis):

```ts
function isPageFile(filePath: string, repoDir: string): boolean
function isDefaultExportedComponent(source: ts.SourceFile): boolean
```

- `isPageFile`: `filePath` is under `<repoDir>/src/pages/` (or `<repoDir>/pages/` —
  support both, since not every Next.js repo nests source under `src/`), and its
  basename isn't one of Next.js's reserved files (`_app`, `_document`, `_error`, `404`,
  `500`).
- `isDefaultExportedComponent`: the file has an `export default` of an identifier that
  was assigned from a capitalized-name function/arrow (`const LangPage = () => {...};
  export default LangPage;`) or a direct `export default function LangPage() {...}`.

A matching file becomes a concept with `type: "Next.js Page"` (a new, distinct type
value so it visually stands out from `"React Component"` in the diagram/Wiki, no icon
expected — same as ordinary components today) and `level: "component"` (C4 has no
extra level for pages; a page is the entry-point component of its own subtree). `id`
generation is unchanged (`${containerId}/${basename}`).

**Route derivation** (needed by "Navigation relations" below): the file's path relative
to `pages/`, minus extension, converted to a Next.js-style route pattern:

| File (relative to `pages/`) | Route pattern    |
|------------------------------|-------------------|
| `index.tsx`                  | `/`               |
| `about.tsx`                  | `/about`          |
| `[slug].tsx`                 | `/:slug` (1 dynamic segment) |
| `blog/[...slug].tsx`          | `/blog/**` (catch-all, 1+ trailing segments) |
| `blog/[[...slug]].tsx`        | `/blog/**?` (optional catch-all, 0+ trailing segments) |

This mapping is computed once per repo scan (`buildRouteTable`) and kept local to
`scan-frontend-repo.ts` — not persisted as a new `ConceptFacts` field, since it's only
needed transiently to match navigation targets during this same scan pass.

**Known limitation carried over, not introduced here**: concept ids are (and remain)
`${containerId}/${basename(file)}` — the same scheme `scan-lambda-repo.ts` already
uses. Two page files with the same basename under different route segments (e.g.
`pages/blog/[slug].tsx` and `pages/docs/[slug].tsx`) would collide on id
`${containerId}/[slug]`. `template-marketing-webapp-nextjs` doesn't hit this (only one
`[slug].tsx`, at the root), so it's out of scope here, but worth flagging since pages
are more collision-prone than arbitrary components — fixing the id scheme to use the
full relative path is a separate, pipeline-wide change (affects lambda scanning too),
not specific to this spec.

## Composition relations (import resolution)

For every scanned file (component or page), inspect its top-level `import`
declarations:

1. Skip `import type { ... }` (type-only) — `ts.ImportClause.isTypeOnly` is a direct AST
   flag, no heuristic needed.
2. Resolve the module specifier to a real file using **`ts.resolveModuleName`**
   (module-specifier, containing-file-path, `compilerOptions`, `ts.sys`) rather than
   hand-rolling relative/alias resolution. `compilerOptions` (`baseUrl`, `paths`) are
   read once per repo from that repo's own `tsconfig.json` via
   `ts.readConfigFile`/`ts.parseJsonConfigFileContent` — this is what makes
   `@src/components/.../ctf-footer-gql` resolve correctly, the same alias style used
   throughout `template-marketing-webapp-nextjs`.
3. If resolution fails, or resolves outside `repoDir` (`node_modules`, external
   packages) — skip silently. This is the overwhelmingly common case (most imports are
   library imports) and isn't an anomaly worth a `needsReview` note.
4. If resolution lands on a file that is *also* a scanned concept in this same repo
   (tracked via a `Map<absoluteFilePath, conceptId>` built while walking `files`) —
   emit a `FactRelation`:
   ```ts
   { targetId, kind: "sync", evidence: `imports ${importedName} from "${specifier}"` }
   ```

This is what turns `layout.tsx` → `Header`/`CtfFooterGql`/`CtfMobileMenuGql`, and (via
the page-detection fix) `pages/index.tsx` → `CtfPageGgl`, into real edges.

## Navigation relations (Link / router.push)

For every scanned file, look for two patterns via `findDescendants`:

1. JSX `<Link href="...">` (imported from `next/link`), where `href` is a string
   literal or a template literal with no interpolated expressions.
2. A call `router.push("...")` / `Router.push("...")` (either `useRouter().push(...)`
   or a directly-imported `Router` from `next/router`), same literal-string
   requirement.

Each literal path found is tested against the repo's route table (see "Page
detection") using a small matcher that understands `:param`/`**` segments the same way
the table's patterns were derived (a literal segment must match exactly; a dynamic
segment matches any single non-empty path segment; a catch-all matches one or more
trailing segments).

- **Match found** → `FactRelation { targetId: <page's conceptId>, kind: "sync",
  evidence: "<Link href=\"/about\"> resolves to page \"about\"" }` (or the
  `router.push(...)` equivalent wording).
- **No match** (external URL, route the repo doesn't have, or a value we can't resolve
  to a literal — e.g. `href={`/blog/${slug}`}` with an interpolated expression) →
  `needsReview: "Link/router.push target \"...\" does not match any known page route"`,
  mirroring the existing unresolved-`fetch()` pattern. Nothing is silently dropped.

In `template-marketing-webapp-nextjs` this signal is weak (2 real routes: `/` and a
dynamic slug), but the capability is general-purpose for repos with richer navigation.

## LLM label enrichment

Today `LlmClient.describeConcept(facts): Promise<string>` returns only prose, and the
`# Relations` section always renders `rel.label ?? rel.evidence` — i.e., every relation
label today is the raw, mechanical evidence string (or, once this spec ships, the
composition/navigation evidence strings above). Per discussion, this is upgraded so the
LLM (which already runs once per changed concept) also proposes a friendlier,
user-flow-oriented label for each relation — without ever being allowed to add,
remove, or retarget a relation.

**Interface change:**

```ts
export interface ConceptDescription {
  prose: string;
  /** parallel to facts.relations; relationLabels[i] describes facts.relations[i] */
  relationLabels: string[];
}
export interface LlmClient {
  describeConcept(facts: ConceptFacts): Promise<ConceptDescription>;
}
```

**Prompt shape**: ask for two clearly delimited sections in the response — plain prose
paragraphs, then a numbered list with exactly `facts.relations.length` entries, one
friendly label per relation in the same order they were given in the prompt (mirroring
how the prompt already lists "Known relations... do not invent any others"). Plain
delimited text, not JSON — easier to parse leniently and less prone to a full parse
failure over one stray character.

**Parsing & fallback**: `createAnthropicLlmClient`'s parser splits on the two section
markers and extracts numbered lines. If the numbered-list section is missing, has the
wrong count, or fails to parse for any reason, **that concept's relation labels
fall back to their raw `evidence` strings** (today's behavior) rather than failing the
whole concept — a formatting hiccup degrades to "technical but correct" labels, it does
not block `synthesize.ts` from writing the file or force a retry. This is a deliberate
asymmetry from `synthesize.ts`'s existing per-concept try/catch (which *does* leave a
concept unwritten on a hard failure like an API error): a parse-shape miss on the
relation-label section specifically is treated as a soft degrade, not a hard failure,
since the prose half of the response is very likely still fine and worth keeping.

**Wiring**: `synthesize.ts` passes `description.relationLabels[i]` as `facts.relations[i].label`
before calling `buildConceptMarkdown`, so `buildRelationsSection`'s existing `rel.label
?? rel.evidence` continues to work unchanged — it'll just almost always have a `label`
now instead of falling through to `evidence`.

## Testing

- `scan-frontend-repo.test.ts` (extended fixture repo under `__fixtures__/frontend-repo/`,
  with a small `tsconfig.json` adding a `@app/*` path alias):
  - a page file (`pages/index.tsx`, default-exported) is scanned with
    `type: "Next.js Page"`.
  - a reserved page file (`pages/_app.tsx`) is **not** scanned.
  - a component importing another scanned component via a relative path produces a
    composition relation.
  - the same via a `paths`-aliased import produces a composition relation.
  - a `import type { Foo }` of another scanned component produces **no** relation.
  - an import resolving into `node_modules` produces no relation and no `needsReview`.
  - `<Link href="/about">` matching a real page produces a navigation relation.
  - `<Link href="/nowhere">` with no matching route produces a `needsReview` entry.
  - `router.push(`/blog/${slug}`)` (interpolated, unresolvable) produces a
    `needsReview` entry.
- `llm.test.ts`: `describeConcept` correctly splits prose vs. numbered relation labels
  on a well-formed response; falls back to raw `evidence` per relation when the
  numbered section is missing or short, without throwing.
- `synthesize.test.ts` (or wherever `buildConceptMarkdown`/`synthesize` are already
  covered): a concept's written `# Relations` section uses the LLM-provided label when
  present, `evidence` when the fallback path was taken.
- Full suite (`npx vitest run scripts/okf-scan`) stays green throughout, TDD per piece
  (scanner first, then LLM/synthesize).

## Rollout

After implementation lands and the full `okf-scan` suite is green:

1. Reset only the `template-marketing-webapp-nextjs` entry in
   `public/okf-bundles/blog/.scan-manifest.json`'s `_repos` map (not a full `--force`),
   so the repo is rescanned but unrelated concepts whose facts didn't change are still
   skipped by the per-concept hash check.
2. Run `npx tsx scripts/okf-scan/index.ts --repo-map repo-map.yaml --env prd --out
   public/okf-bundles/blog`.
3. Verify via `npm run validate` and a direct `importOkfBundle` check (as done for the
   earlier container-concept fix) that relations are now non-empty and render in both
   the diagram and the Wiki tab.
