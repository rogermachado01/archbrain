/**
 * Shared "# Heading" markdown-section parsing used by both the OKF importer
 * (`okf-import.ts`, browser + `scripts/validate-model.ts`) and the OKF
 * scanner's markdown synthesizer (`scripts/okf-scan/synthesize/markdown.ts`).
 * Split out into its own module (rather than exported straight from
 * `okf-import.ts`) so consumers that only need section parsing don't also
 * pull in `okf-import.ts`'s other dependencies (e.g. `aws-icons.ts`, which
 * resolves the `@/*` path alias — not configured for `scripts/**` under
 * vitest, see vitest.config.ts).
 */

/** Body text of a `# Heading` section, up to (not including) the next `# Heading`. */
export function extractSection(body: string, heading: string): string | null {
  const lines = body.split("\n");
  const startIdx = lines.findIndex((l) => l.trim().toLowerCase() === `# ${heading}`.toLowerCase());
  if (startIdx === -1) return null;
  const rest = lines.slice(startIdx + 1);
  const endIdx = rest.findIndex((l) => /^#\s+/.test(l));
  return (endIdx === -1 ? rest : rest.slice(0, endIdx)).join("\n").trim();
}

/**
 * `# Links` bullets are operational links (repo, runbook, dashboard), not
 * navigation — only absolute URLs are accepted; relative `.md` links (which
 * would belong in `# Relations` instead) are silently skipped.
 */
export function parseLinksSection(body: string): { label: string; url: string }[] {
  const section = extractSection(body, "Links");
  if (!section) return [];
  return section
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (!linkMatch) return null;
      const [, label, url] = linkMatch;
      if (!/^https?:\/\//i.test(url)) return null;
      return { label, url };
    })
    .filter((l): l is { label: string; url: string } => l !== null);
}
