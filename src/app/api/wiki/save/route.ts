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
