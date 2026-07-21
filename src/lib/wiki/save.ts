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
