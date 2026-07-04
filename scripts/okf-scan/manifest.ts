import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptyManifest, type ScanManifest } from "./types";

export const MANIFEST_FILENAME = ".scan-manifest.json";

export function manifestPath(bundleDir: string): string {
  return path.join(bundleDir, MANIFEST_FILENAME);
}

export async function loadManifest(bundleDir: string): Promise<ScanManifest> {
  try {
    const raw = await readFile(manifestPath(bundleDir), "utf-8");
    return JSON.parse(raw) as ScanManifest;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyManifest();
    throw err;
  }
}

export async function saveManifest(bundleDir: string, manifest: ScanManifest): Promise<void> {
  await writeFile(manifestPath(bundleDir), `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}
