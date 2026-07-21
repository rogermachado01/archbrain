import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { saveWikiPage, type WikiSaveIo } from "@/lib/wiki/save";
import { DATA_SOURCES } from "@/lib/data-sources";

// Mirrors src/app/api/pipeline/validate/route.ts's own fsIo: these virtual
// "/"-rooted paths (the same convention the browser's fetch("/okf-bundles/...")
// uses) map onto the filesystem's public/ directory.
const PUBLIC_DIR = path.join(process.cwd(), "public");

// saveWikiPage's own containment check only validates that `path` stays
// within whatever `basePath` it's given — it never validates `basePath`
// itself. Since `basePath` comes straight from an unauthenticated request
// body, it must be checked against the actual set of OKF bundle roots this
// app is configured to serve (the same okfBasePath values DataSourceSelector
// already only ever offers the user), or a crafted basePath (e.g.
// "/../../../../tmp/evil") lets a write land outside public/ entirely.
const ALLOWED_BASE_PATHS = new Set(
  DATA_SOURCES.map((s) => s.okfBasePath).filter((p): p is string => Boolean(p))
);

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
    if (!ALLOWED_BASE_PATHS.has(basePath)) {
      throw new Error(`"basePath" must be a configured OKF bundle source (got "${basePath}")`);
    }

    const result = await saveWikiPage(basePath, relPath, content, wikiFsIo);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
