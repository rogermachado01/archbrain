import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next"]);

/** Recursively lists .ts/.tsx/.js/.jsx files under `dir`, skipping build/dependency directories. */
export async function listSourceFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(fullPath);
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) results.push(fullPath);
    }
  }
  await walk(dir);
  return results.sort();
}

/** Syntactic-only parse (no type checker, no Program) — enough for the AST shapes these scanners look for. */
export async function parseSourceFile(filePath: string): Promise<ts.SourceFile> {
  const text = await readFile(filePath, "utf-8");
  const scriptKind = filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, scriptKind);
}

/** Depth-first collection of every descendant node matching `test` (root included). */
export function findDescendants<T extends ts.Node>(root: ts.Node, test: (node: ts.Node) => node is T): T[] {
  const results: T[] = [];
  function visit(node: ts.Node): void {
    if (test(node)) results.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return results;
}
