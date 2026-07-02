"use client";

import { useEffect, useState } from "react";
import { marked } from "marked";
import { parseFrontmatter } from "@/lib/frontmatter";
import { resolveRelativePath } from "@/lib/paths";

interface OkfWikiViewerProps {
  basePath: string;
  /** relative .md path within the bundle to open first, e.g. "index.md" or "order-system/order-processor.md" */
  initialPath: string;
}

interface LoadedPage {
  path: string;
  html: string;
  meta: { title?: string; description?: string };
}
interface FailedPage {
  path: string;
  message: string;
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
 * NOTE: renders bundle HTML via `marked` with `dangerouslySetInnerHTML` and no
 * sanitization. Safe only because bundles under public/okf-bundles/ are
 * static files we author ourselves (same trust level as our own JSON data) —
 * if a bundle source is ever pointed at untrusted/external content, add
 * sanitization (e.g. DOMPurify) before rendering.
 */
export default function OkfWikiViewer({ basePath, initialPath }: OkfWikiViewerProps) {
  const [path, setPath] = useState(initialPath);
  const [history, setHistory] = useState<string[]>([initialPath]);
  const [loadedPage, setLoadedPage] = useState<LoadedPage | null>(null);
  const [failedPage, setFailedPage] = useState<FailedPage | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${basePath}/${path}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((raw) => {
        if (cancelled) return;
        const { data, content } = parseFrontmatter(raw);
        setLoadedPage({
          path,
          html: marked.parse(content) as string,
          meta: {
            title: typeof data.title === "string" ? data.title : undefined,
            description: typeof data.description === "string" ? data.description : undefined,
          },
        });
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

  return (
    <div className="okf-wiki">
      <div className="okf-wiki-toolbar">
        <button onClick={goBack} disabled={history.length <= 1}>
          ← Back
        </button>
        <span className="okf-wiki-path">{path}</span>
      </div>
      {error ? (
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
