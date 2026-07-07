/**
 * Reproduces the exact DATA_SOURCES entry string scripts/okf-scan/index.ts's
 * main() prints at the end of a CLI run, so the wizard can show the same
 * copy-paste snippet — deliberately not written to src/lib/data-sources.ts
 * automatically (see the design spec's "Non-goals").
 */
export function dataSourceSnippet(out: string): string {
  const id = out.split(/[\\/]/).filter(Boolean).pop() ?? out;
  return `{\n  id: "${id}",\n  label: "${id}",\n  load: () => importOkfBundle("/okf-bundles/${id}").then(validateArchModel),\n  okfBasePath: "/okf-bundles/${id}",\n},`;
}
