import { readFile } from "node:fs/promises";
import path from "node:path";

interface OwnerRule {
  pattern: string;
  owner: string;
}

const CODEOWNERS_LOCATIONS = ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"];

async function readCodeowners(repoDir: string): Promise<OwnerRule[]> {
  for (const candidate of CODEOWNERS_LOCATIONS) {
    try {
      const text = await readFile(path.join(repoDir, candidate), "utf-8");
      return text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))
        .map((line) => {
          const [pattern, ...owners] = line.split(/\s+/);
          return { pattern, owner: owners[0]?.replace(/^@/, "") ?? "" };
        })
        .filter((rule): rule is OwnerRule => rule.owner.length > 0);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
  return [];
}

/** Loosely matches CODEOWNERS glob patterns: `*`, extension globs, and directory prefixes. */
function matchesPattern(relativePath: string, pattern: string): boolean {
  if (pattern === "*") return true;
  const normalized = pattern.replace(/^\//, "");
  if (normalized.endsWith("/")) return relativePath.startsWith(normalized);
  if (normalized.startsWith("*.")) return relativePath.endsWith(normalized.slice(1));
  return relativePath === normalized || relativePath.startsWith(`${normalized}/`);
}

/** Last matching rule wins, same precedence GitHub's own CODEOWNERS resolution uses. */
export async function ownerForFile(repoDir: string, filePath: string): Promise<string | undefined> {
  const rules = await readCodeowners(repoDir);
  const relativePath = path.relative(repoDir, filePath).split(path.sep).join("/");
  let owner: string | undefined;
  for (const rule of rules) {
    if (matchesPattern(relativePath, rule.pattern)) owner = rule.owner;
  }
  return owner;
}
