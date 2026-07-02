/**
 * Resolves a markdown-link href relative to the directory a document lives
 * in (e.g. `../groups/x.md` from `/okf-bundles/foo/order-system`), the same
 * way a browser resolves a relative URL — using a throwaway origin purely as
 * a resolution sandbox, not an actual network location.
 */
export function resolveRelativePath(dirPath: string, href: string): string {
  return new URL(href, `https://okf.local${dirPath}/`).pathname;
}
