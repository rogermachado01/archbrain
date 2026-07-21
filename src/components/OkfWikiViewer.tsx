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
