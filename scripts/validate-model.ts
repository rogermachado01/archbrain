import { access, readFile } from "node:fs/promises";
import { DATA_SOURCES } from "../src/lib/data-sources";
import { importOkfBundle, type OkfIo } from "../src/lib/okf-import";
import { validateArchModel } from "../src/lib/validate-model";

/**
 * CI/local entry point for docs-as-code validation (docs/refinamento-tecnico.md,
 * item 5): runs the same validateArchModel used in the browser against every
 * registered DATA_SOURCES entry, reading files from disk instead of fetch()
 * via the OkfIo abstraction okf-import.ts exposes for exactly this purpose.
 */

// importOkfBundle treats `basePath`/link targets as absolute paths rooted at
// "/" (the same convention the browser's fetch("/okf-bundles/...") uses) —
// so this io maps that logical root onto the filesystem's public/ directory,
// rather than mangling basePath itself (which would break resolveRelativePath's
// URL-based relative-link resolution).
const fsIo: OkfIo = {
  readText: (path) => readFile(`public${path}`, "utf-8"),
  exists: (path) =>
    access(`public${path}`)
      .then(() => true)
      .catch(() => false),
};

async function main() {
  let failed = false;

  for (const source of DATA_SOURCES) {
    try {
      if (source.okfBasePath) {
        await importOkfBundle(source.okfBasePath, fsIo).then(validateArchModel);
      } else {
        await source.load();
      }
      console.log(`ok    ${source.id}`);
    } catch (err) {
      failed = true;
      console.error(`FAIL  ${source.id}`);
      console.error(err instanceof Error ? err.message : String(err));
    }
  }

  if (failed) {
    console.error("\nvalidate-model: one or more architecture models are invalid.");
    process.exit(1);
  }
  console.log("\nvalidate-model: all architecture models are valid.");
}

main();
