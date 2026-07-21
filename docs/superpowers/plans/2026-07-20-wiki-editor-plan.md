# OKF Wiki Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user edit an OKF bundle page's raw markdown from the Wiki tab and save it back to disk, with validation before write and a live diagram reload on save.

**Architecture:** A new `saveWikiPage` lib function (validate-then-write, using an overlay `OkfIo` so only the edited page is simulated in memory while the rest of the bundle is checked against real disk) backs a thin `POST /api/wiki/save` route. `OkfWikiViewer` gains a textarea edit mode that posts to that route; on success it reparses locally and tells `ArchVizApp` to bump a `reloadNonce` so the already-loaded `ArchModel` refetches.

**Tech Stack:** Next.js 16 Route Handlers, React (client component), Vitest, existing `okf-import.ts`/`validate-model.ts`/`frontmatter.ts`.

**Spec:** `docs/superpowers/specs/2026-07-20-wiki-editor-design.md`

---

## Task 1: `saveWikiPage` — validate-then-write lib function

**Files:**
- Create: `src/lib/wiki/save.ts`
- Test: `src/lib/wiki/save.test.ts`

This is the one genuinely new piece of logic in the whole feature (per the spec's "Testing" section) — everything else is either a thin route wrapper or UI plumbing. Full TDD.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/wiki/save.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { saveWikiPage, type WikiSaveIo } from "./save";

const BASE_PATH = "/bundle";

const INDEX_MD = `---
title: Test Bundle
---
- [Page A](page-a.md) - desc
- [Page B](page-b.md) - desc
`;

const PAGE_A_MD = `---
title: Page A
level: container
---
# Relations
- [Page B](page-b.md) — calls
`;

const PAGE_B_MD = `---
title: Page B
level: container
---
`;

function makeFakeIo(files: Record<string, string>): WikiSaveIo & { written: Record<string, string> } {
  const written: Record<string, string> = {};
  return {
    written,
    readText: async (p) => {
      if (p in written) return written[p];
      if (p in files) return files[p];
      throw new Error(`fake io: no such file "${p}"`);
    },
    exists: async (p) => p in written || p in files,
    writeText: async (p, content) => {
      written[p] = content;
    },
  };
}

function baseFiles(): Record<string, string> {
  return {
    [`${BASE_PATH}/index.md`]: INDEX_MD,
    [`${BASE_PATH}/page-a.md`]: PAGE_A_MD,
    [`${BASE_PATH}/page-b.md`]: PAGE_B_MD,
  };
}

describe("saveWikiPage", () => {
  it("writes the edited content and returns ok:true for a valid edit", async () => {
    const io = makeFakeIo(baseFiles());
    const edited = PAGE_B_MD.replace("Page B", "Page B (renamed)");

    const result = await saveWikiPage(BASE_PATH, "page-b.md", edited, io);

    expect(result).toEqual({ ok: true });
    expect(io.written[`${BASE_PATH}/page-b.md`]).toBe(edited);
  });

  it("rejects an edit whose Relations section points at a node that doesn't exist, and never writes", async () => {
    const io = makeFakeIo(baseFiles());
    const edited = PAGE_A_MD.replace("[Page B](page-b.md)", "[Ghost](nope.md)");

    const result = await saveWikiPage(BASE_PATH, "page-a.md", edited, io);

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toContain("nope");
    expect(io.written).toEqual({});
  });

  it("rejects a path that would escape basePath, before touching io", async () => {
    const io = makeFakeIo(baseFiles());

    const result = await saveWikiPage(BASE_PATH, "../../etc/passwd", "evil", io);

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toContain(BASE_PATH);
    expect(io.written).toEqual({});
  });

  it("validates the edited page's relations against the real content of every other page", async () => {
    const io = makeFakeIo(baseFiles());
    const edited = PAGE_A_MD.replace("Page A", "Page A (renamed)");

    const result = await saveWikiPage(BASE_PATH, "page-a.md", edited, io);

    expect(result).toEqual({ ok: true });
    expect(io.written[`${BASE_PATH}/page-a.md`]).toBe(edited);
    expect(io.written[`${BASE_PATH}/page-b.md`]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/wiki/save.test.ts`
Expected: FAIL — `Cannot find module './save'` (the module doesn't exist yet).

- [ ] **Step 3: Implement `saveWikiPage`**

Create `src/lib/wiki/save.ts`:

```ts
import path from "node:path";
import { importOkfBundle, type OkfIo } from "../okf-import";
import { validateArchModel } from "../validate-model";

/**
 * Same OkfIo contract okf-import.ts already defines, plus the one capability
 * writing needs. The production implementation
 * (src/app/api/wiki/save/route.ts) maps these virtual "/"-rooted paths onto
 * real files under public/, mirroring
 * src/app/api/pipeline/validate/route.ts's own fsIo.
 */
export interface WikiSaveIo extends OkfIo {
  writeText(path: string, content: string): Promise<void>;
}

export type SaveWikiPageResult = { ok: true } | { ok: false; error: string };

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Resolves basePath+relPath into one normalized virtual path, rejecting a
 * relPath that would escape basePath's own tree (e.g. "../../secret.md") —
 * the same segment-aware containment idiom
 * src/app/api/pipeline/validate/route.ts's toLogicalBundlePath already uses,
 * generalized to an arbitrary basePath instead of a fixed public/ root.
 */
function resolveWikiFilePath(basePath: string, relPath: string): string {
  const normalizedBase = path.posix.normalize(basePath);
  const normalized = path.posix.normalize(`${normalizedBase}/${relPath}`);
  if (normalized !== normalizedBase && !normalized.startsWith(`${normalizedBase}/`)) {
    throw new Error(`"path" must resolve within "${basePath}" (got "${relPath}")`);
  }
  return normalized;
}

/**
 * Validates an edited OKF bundle page before writing it to disk: builds an
 * overlay OkfIo that serves `content` for the one page being edited and the
 * real io for every other file in the bundle, then runs the same
 * importOkfBundle + validateArchModel check the app already trusts
 * elsewhere. Only writes (via io.writeText) if that validation passes — the
 * on-disk file is never touched on a rejected edit.
 */
export async function saveWikiPage(
  basePath: string,
  relPath: string,
  content: string,
  io: WikiSaveIo
): Promise<SaveWikiPageResult> {
  let targetPath: string;
  try {
    targetPath = resolveWikiFilePath(basePath, relPath);
  } catch (err) {
    return { ok: false, error: toMessage(err) };
  }

  const overlayIo: OkfIo = {
    readText: (p) => (path.posix.normalize(p) === targetPath ? Promise.resolve(content) : io.readText(p)),
    exists: (p) => (path.posix.normalize(p) === targetPath ? Promise.resolve(true) : io.exists(p)),
  };

  try {
    await importOkfBundle(basePath, overlayIo).then(validateArchModel);
  } catch (err) {
    return { ok: false, error: toMessage(err) };
  }

  try {
    await io.writeText(targetPath, content);
  } catch (err) {
    return { ok: false, error: toMessage(err) };
  }

  return { ok: true };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/wiki/save.test.ts`
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/wiki/save.ts src/lib/wiki/save.test.ts
git commit -m "feat(wiki): add saveWikiPage validate-then-write lib function"
```

---

## Task 2: `POST /api/wiki/save` route

**Files:**
- Create: `src/app/api/wiki/save/route.ts`

Thin wrapper around Task 1's `saveWikiPage`, mirroring `src/app/api/pipeline/validate/route.ts`'s own `fsIo`/error-handling shape. No route-level test, consistent with the existing `/api/pipeline/*` routes (verified end-to-end in Task 4 instead).

- [ ] **Step 1: Implement the route**

Create `src/app/api/wiki/save/route.ts`:

```ts
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { saveWikiPage, type WikiSaveIo } from "@/lib/wiki/save";

// Mirrors src/app/api/pipeline/validate/route.ts's own fsIo: these virtual
// "/"-rooted paths (the same convention the browser's fetch("/okf-bundles/...")
// uses) map onto the filesystem's public/ directory.
const PUBLIC_DIR = path.join(process.cwd(), "public");

const wikiFsIo: WikiSaveIo = {
  readText: (p) => readFile(path.join(PUBLIC_DIR, p), "utf-8"),
  exists: (p) =>
    access(path.join(PUBLIC_DIR, p))
      .then(() => true)
      .catch(() => false),
  writeText: (p, content) => writeFile(path.join(PUBLIC_DIR, p), content, "utf-8"),
};

export async function POST(request: Request) {
  try {
    const { basePath, path: relPath, content } = (await request.json()) as {
      basePath?: string;
      path?: string;
      content?: string;
    };
    if (!basePath) throw new Error("Missing required field: basePath");
    if (!relPath) throw new Error("Missing required field: path");
    if (content === undefined) throw new Error("Missing required field: content");

    const result = await saveWikiPage(basePath, relPath, content, wikiFsIo);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/wiki/save/route.ts
git commit -m "feat(wiki): add POST /api/wiki/save route"
```

---

## Task 3: Wiki editor UI + diagram reload

**Files:**
- Modify: `src/lib/okf-import.ts` (browser fetch cache-busting)
- Modify: `src/components/ArchVizApp.tsx` (reload wiring)
- Modify: `src/components/SidePanel.tsx` (prop threading)
- Modify: `src/components/OkfWikiViewer.tsx` (edit mode UI)
- Modify: `src/app/globals.css` (editor styles)

This is the client-side half of the feature — all of it lands together because `OkfWikiViewer`'s edit mode, the `onSaved` prop it needs, and `ArchVizApp`'s reload state are interdependent; splitting them would leave a half-wired prop with nothing consuming it. No automated test for this task, consistent with `src/components/**`'s existing convention (CLAUDE.md's "Rendering pipeline" section) — verified manually in Task 4.

- [ ] **Step 1: Cache-bust the browser OKF fetches**

In `src/lib/okf-import.ts`, replace the `browserIo` definition (lines 28-42):

```ts
const browserIo: OkfIo = {
  async readText(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`OKF import: failed to fetch "${path}" (HTTP ${res.status})`);
    return res.text();
  },
  async exists(path) {
    try {
      const res = await fetch(path);
      return res.ok;
    } catch {
      return false;
    }
  },
};
```

with:

```ts
// `cache: "no-store"` on both calls: a wiki-editor save (see saveWikiPage in
// src/lib/wiki/save.ts) can trigger a reload of the same sourceId's
// ArchModel, and a production (`next start`) serve of public/ risks the
// browser's HTTP cache returning pre-edit file content without this.
const browserIo: OkfIo = {
  async readText(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`OKF import: failed to fetch "${path}" (HTTP ${res.status})`);
    return res.text();
  },
  async exists(path) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      return res.ok;
    } catch {
      return false;
    }
  },
};
```

- [ ] **Step 2: Add reload state to `ArchVizApp.tsx`**

In `src/components/ArchVizApp.tsx`, add `reloadNonce` state right after the existing `loaded`/`loadFailed` state (after line 58, before `searchOpen`):

```ts
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadFailed, setLoadFailed] = useState<LoadFailed | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
```

Change the load effect's dependency array (currently `}, [sourceId]);` at line 82) to also depend on `reloadNonce` — this is the only change to the effect itself; leave the pre-existing "Derived (not reset via setState)" comment on the `archModel`/`loadError` lines just below it (lines 84-87) untouched, since that comment documents those derivation lines, not the effect:

```ts
  useEffect(() => {
    let cancelled = false;
    const source = DATA_SOURCES.find((s) => s.id === sourceId);
    if (!source) return;

    source
      .load()
      .then((model) => {
        if (!cancelled) setLoaded({ sourceId, model });
      })
      .catch((err) => {
        if (!cancelled) setLoadFailed({ sourceId, message: err instanceof Error ? err.message : String(err) });
      });

    return () => {
      cancelled = true;
    };
    // reloadNonce is a second reason for this effect to re-run — bumped by
    // triggerWikiReload (below) after a wiki-editor save, so the same
    // sourceId's model refetches instead of only ever loading once per id.
  }, [sourceId, reloadNonce]);
```

Add a `triggerWikiReload` function next to the other handlers (right after `handleTabChange`, around line 237):

```ts
  function triggerWikiReload() {
    setReloadNonce((n) => n + 1);
  }
```

Pass it to `SidePanel` (in the JSX around line 318-332, add the new prop):

```tsx
        <SidePanel
          node={selectedNode}
          clusterMembers={
            isSelectedNodeCluster && archModel
              ? selectedNode!.synthetic!.memberIds
                  .map((id) => findNode(archModel, id))
                  .filter((n): n is ArchNode => Boolean(n))
              : undefined
          }
          wikiAvailable={Boolean(activeSource?.okfBasePath) && !isSelectedNodeCluster}
          wikiBasePath={activeSource?.okfBasePath}
          wikiEntryPath={wikiEntryPath}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onWikiSaved={triggerWikiReload}
        />
```

- [ ] **Step 3: Thread the prop through `SidePanel.tsx`**

In `src/components/SidePanel.tsx`, add `onWikiSaved` to `SidePanelProps` (after `onTabChange`):

```ts
interface SidePanelProps {
  node: ArchNode | null;
  /** Resolved member nodes, only set when `node` is a bounded-context cluster pseudo-node. */
  clusterMembers?: ArchNode[];
  wikiAvailable: boolean;
  wikiBasePath?: string;
  /** relative .md path to open, derived from whatever the diagram currently has in focus */
  wikiEntryPath: string;
  activeTab: SidePanelTab;
  onTabChange: (tab: SidePanelTab) => void;
  /** called after a successful wiki-page save, so the caller can refresh the loaded ArchModel */
  onWikiSaved: () => void;
}
```

Destructure it in the function signature and pass it to `OkfWikiViewer`:

```tsx
export default function SidePanel({
  node,
  clusterMembers,
  wikiAvailable,
  wikiBasePath,
  wikiEntryPath,
  activeTab,
  onTabChange,
  onWikiSaved,
}: SidePanelProps) {
  const tab: SidePanelTab = activeTab === "wiki" && wikiAvailable ? "wiki" : "resource";

  return (
    <aside className={tab === "wiki" ? "side-panel side-panel--wiki" : "side-panel"}>
      <div className="side-panel-tabs" role="tablist" aria-label="Resource details">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "resource"}
          className={tab === "resource" ? "active" : ""}
          onClick={() => onTabChange("resource")}
        >
          Resource
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "wiki"}
          className={tab === "wiki" ? "active" : ""}
          disabled={!wikiAvailable}
          title={wikiAvailable ? "Browse the OKF bundle's markdown docs" : "This source has no OKF docs to browse"}
          onClick={() => onTabChange("wiki")}
        >
          Wiki
        </button>
      </div>
      <div className="side-panel-body">
        {tab === "wiki" && wikiBasePath ? (
          <OkfWikiViewer key={wikiEntryPath} basePath={wikiBasePath} initialPath={wikiEntryPath} onSaved={onWikiSaved} />
        ) : (
          <div className="details-panel">
            <DetailsPanel node={node} clusterMembers={clusterMembers} />
          </div>
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Rewrite `OkfWikiViewer.tsx` with edit mode**

Replace the full contents of `src/components/OkfWikiViewer.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { marked } from "marked";
import { parseFrontmatter } from "@/lib/frontmatter";
import { resolveRelativePath } from "@/lib/paths";
import type { SaveWikiPageResult } from "@/lib/wiki/save";

interface OkfWikiViewerProps {
  basePath: string;
  /** relative .md path within the bundle to open first, e.g. "index.md" or "order-system/order-processor.md" */
  initialPath: string;
  /** called after a successful save, so the caller can refresh the loaded ArchModel */
  onSaved?: () => void;
}

interface LoadedPage {
  path: string;
  /** the exact raw file text (frontmatter + body) — edited and saved verbatim, never reconstructed from parsed pieces */
  raw: string;
  html: string;
  meta: { title?: string; description?: string };
}
interface FailedPage {
  path: string;
  message: string;
}

function parsePage(path: string, raw: string): LoadedPage {
  const { data, content } = parseFrontmatter(raw);
  return {
    path,
    raw,
    html: marked.parse(content) as string,
    meta: {
      title: typeof data.title === "string" ? data.title : undefined,
      description: typeof data.description === "string" ? data.description : undefined,
    },
  };
}

/**
 * Renders the raw markdown files of an OKF bundle for reading — a separate
 * concern from `okf-import.ts`, which extracts structured data for the
 * diagram. Clicking a relative `.md` link inside the rendered page navigates
 * within this viewer instead of leaving the app.
 *
 * The parent mounts this with `key={initialPath}` (see page.tsx) so entering
 * the wiki at a new starting page gets a fresh component instance instead of
 * needing an effect to reset internal navigation state.
 *
 * Also supports editing: "Editar" swaps the rendered article for a textarea
 * holding the page's exact raw text (frontmatter + body). Saving posts the
 * edited text to POST /api/wiki/save verbatim — nothing is ever reconstructed
 * from parsed pieces, so nothing the hand-rolled frontmatter parser doesn't
 * fully round-trip can be lost. While editing, back/in-content-link
 * navigation is disabled (no confirm() dialog) — the only way out is Salvar
 * or Cancelar.
 *
 * NOTE: renders bundle HTML via `marked` with `dangerouslySetInnerHTML` and no
 * sanitization. Safe only because bundles under public/okf-bundles/ are
 * static files we author ourselves (same trust level as our own JSON data) —
 * if a bundle source is ever pointed at untrusted/external content, add
 * sanitization (e.g. DOMPurify) before rendering.
 */
export default function OkfWikiViewer({ basePath, initialPath, onSaved }: OkfWikiViewerProps) {
  const [path, setPath] = useState(initialPath);
  const [history, setHistory] = useState<string[]>([initialPath]);
  const [loadedPage, setLoadedPage] = useState<LoadedPage | null>(null);
  const [failedPage, setFailedPage] = useState<FailedPage | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${basePath}/${path}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((raw) => {
        if (cancelled) return;
        setLoadedPage(parsePage(path, raw));
      })
      .catch((err) => {
        if (!cancelled) setFailedPage({ path, message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [basePath, path]);

  // Derived (not reset via setState) so navigating to a new page shows
  // nothing stale until its own fetch resolves.
  const raw = loadedPage && loadedPage.path === path ? loadedPage.raw : "";
  const html = loadedPage && loadedPage.path === path ? loadedPage.html : "";
  const meta = loadedPage && loadedPage.path === path ? loadedPage.meta : {};
  const error = failedPage && failedPage.path === path ? failedPage.message : null;

  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const link = (e.target as HTMLElement).closest("a");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || /^([a-z]+:)?\/\//i.test(href) || !href.endsWith(".md")) return; // external link or non-bundle link: let it behave normally

    e.preventDefault();
    const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    const resolved = resolveRelativePath(`/${dir}`, href).replace(/^\/+/, "");
    setPath(resolved);
    setHistory((h) => [...h, resolved]);
  }

  function goBack() {
    setHistory((h) => {
      if (h.length <= 1) return h;
      const next = h.slice(0, -1);
      setPath(next[next.length - 1]);
      return next;
    });
  }

  function handleEditClick() {
    setDraft(raw);
    setSaveError(null);
    setEditing(true);
  }

  function handleCancelClick() {
    setEditing(false);
    setDraft("");
    setSaveError(null);
  }

  async function handleSaveClick() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/wiki/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePath, path, content: draft }),
      });
      const result = (await res.json()) as SaveWikiPageResult;
      if (!result.ok) {
        setSaveError(result.error);
        setSaving(false);
        return;
      }
      setLoadedPage(parsePage(path, draft));
      setEditing(false);
      setSaving(false);
      onSaved?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      handleSaveClick();
    }
  }

  return (
    <div className="okf-wiki">
      <div className="okf-wiki-toolbar">
        {editing ? (
          <>
            <button onClick={handleSaveClick} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={handleCancelClick} disabled={saving}>
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button onClick={goBack} disabled={history.length <= 1}>
              ← Back
            </button>
            <button onClick={handleEditClick} disabled={!raw}>
              Editar
            </button>
          </>
        )}
        <span className="okf-wiki-path">{path}</span>
      </div>
      {editing ? (
        <div className="okf-wiki-editor">
          <textarea
            className="okf-wiki-editor-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            spellCheck={false}
          />
          {saveError && (
            <p className="okf-wiki-error">Failed to save &quot;{path}&quot;: {saveError}</p>
          )}
        </div>
      ) : error ? (
        <p className="okf-wiki-error">
          Failed to load &quot;{path}&quot;: {error}
        </p>
      ) : (
        <article className="okf-wiki-content">
          {meta.title && <h1>{meta.title}</h1>}
          {meta.description && <p className="okf-wiki-description">{meta.description}</p>}
          <div onClick={handleContentClick} dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Add editor styles**

In `src/app/globals.css`, insert after the `.okf-wiki-error` block (after line 129):

```css
.okf-wiki-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.okf-wiki-editor-textarea {
  width: 100%;
  min-height: 480px;
  font: 13px/1.5 ui-monospace, Consolas, monospace;
  padding: 12px;
  border: 1px solid #d8dee6;
  border-radius: 6px;
  resize: vertical;
  box-sizing: border-box;
}
```

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/okf-import.ts src/components/ArchVizApp.tsx src/components/SidePanel.tsx src/components/OkfWikiViewer.tsx src/app/globals.css
git commit -m "feat(wiki): add wiki page edit mode with diagram reload on save"
```

---

## Task 4: End-to-end manual verification

**Files:** none (verification only)

No automated coverage exists for `src/components/**` or for `route.ts` handlers in this repo (see CLAUDE.md's "Rendering pipeline" section and the existing `/api/pipeline/*` routes) — this task is the manual pass the spec's "Testing" section calls for, using the real `public/okf-bundles/order-system` bundle already in the repo.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts at `http://localhost:3000`.

- [ ] **Step 2: Open the Order System bundle's Wiki tab**

In the browser: select **"Order System (OKF bundle)"** from the data source dropdown, click the **order-table** node (Order Table, a DynamoDB table under the `order-system` container — drill into `order-system` first if it's not visible at the root view), then click the **Wiki** tab in the side panel. Confirm the rendered page shows "Order Table" with its Schema-derived properties visible on the **Resource** tab (`billingMode: PAY_PER_REQUEST`, `partitionKey: orderId`) for comparison after the edit.

- [ ] **Step 3: Make a valid edit and confirm it saves + reloads the diagram**

Click **Editar**. In the textarea, change the `# Schema` section's `partitionKey: orderId` line to `partitionKey: order_id`. Click **Salvar**.

Expected:
- Button briefly shows "Salvando...", then the toolbar returns to **← Back** / **Editar**.
- The rendered page re-displays with no error.
- Switch to the **Resource** tab: `partitionKey` now reads `order_id` — confirms the `reloadNonce`-triggered `ArchModel` refetch picked up the change without a page refresh.

- [ ] **Step 4: Make an invalid edit and confirm it's rejected without writing**

Click **Editar** again. Add a broken relation line inside (or add, if none exists) a `# Relations` section: `- [Ghost](does-not-exist.md) — calls`. Click **Salvar**.

Expected:
- An inline error appears below the textarea (mentioning the dangling relation/target).
- The textarea keeps your edited text (not reverted).
- Switch to the **Resource** tab and back to **Wiki**: the page still shows the *previous* valid content (`order_id`, from Step 3) — proving the rejected write never touched disk.

Click **Cancelar** to discard this broken edit.

- [ ] **Step 5: Confirm Ctrl+S works**

Click **Editar**, change the description text, press **Ctrl+S** (or **Cmd+S** on Mac) with focus in the textarea. Confirm this triggers the same save as clicking **Salvar** (button shows "Salvando...", then returns to view mode) and the browser's own save-page dialog does not appear.

- [ ] **Step 6: Cross-check with the CLI validation path**

Run: `npm run validate`
Expected: passes for every `DATA_SOURCES` entry, confirming the edits made via the browser save path are still valid through the CLI's independent `fs`-based `importOkfBundle`/`validateArchModel` path (`scripts/validate-model.ts`).

- [ ] **Step 7: Restore the test fixture**

The manual pass above intentionally modified `public/okf-bundles/order-system/order-system/order-table.md` on disk. Revert it so the repo's example bundle stays unchanged:

```bash
git checkout -- public/okf-bundles/order-system/order-system/order-table.md
```

Run: `git status`
Expected: no uncommitted changes remain under `public/okf-bundles/`.

- [ ] **Step 8: Run the full test suite once more**

Run: `npx vitest run`
Expected: all tests pass, including the 4 new ones from Task 1.

- [ ] **Step 9: Update the roadmap in CLAUDE.md**

In `CLAUDE.md`'s "Roadmap: editable flows & wiki with AI-assisted sync" section, change phase 1's line from:

```
1. **Wiki editor** *(in progress — see latest spec in `docs/superpowers/specs/`)* — make
```

to:

```
1. **Wiki editor** *(done — `docs/superpowers/specs/2026-07-20-wiki-editor-design.md`)* — make
```

- [ ] **Step 10: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark wiki editor roadmap phase done"
```
