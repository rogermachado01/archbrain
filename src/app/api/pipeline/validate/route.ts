import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { importOkfBundle, type OkfIo } from "@/lib/okf-import";
import { validateArchModel } from "@/lib/validate-model";

// Mirrors scripts/validate-model.ts's fsIo: importOkfBundle treats basePath as
// rooted at "/", the same convention the browser's fetch("/okf-bundles/...")
// uses — so this maps that logical root onto the filesystem's public/ dir.
const PUBLIC_DIR = path.join(process.cwd(), "public");
const fsIo: OkfIo = {
  readText: (p) => readFile(path.join(PUBLIC_DIR, p), "utf-8"),
  exists: (p) =>
    access(path.join(PUBLIC_DIR, p))
      .then(() => true)
      .catch(() => false),
};

function toLogicalBundlePath(out: string): string {
  const relative = path.relative(PUBLIC_DIR, path.resolve(out));
  if (relative.startsWith("..")) {
    throw new Error(`"out" must be a path under public/ (got "${out}")`);
  }
  return `/${relative.replace(/\\/g, "/")}`;
}

export async function POST(request: Request) {
  try {
    const { out } = (await request.json()) as { out?: string };
    if (!out) throw new Error("Missing required field: out");
    const basePath = toLogicalBundlePath(out);
    await importOkfBundle(basePath, fsIo).then(validateArchModel);
    return NextResponse.json({ valid: true });
  } catch (err) {
    return NextResponse.json({ valid: false, error: err instanceof Error ? err.message : String(err) });
  }
}
