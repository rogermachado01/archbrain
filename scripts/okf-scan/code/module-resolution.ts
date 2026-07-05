import path from "node:path";
import ts from "typescript";

/**
 * Reads `repoDir`'s own tsconfig.json (baseUrl/paths/moduleResolution) so
 * `resolveImportedFile` can resolve aliased imports (e.g. "@src/foo") the same way the
 * repo's own compiler would. Deliberately never returns a tsconfig found ABOVE
 * `repoDir` — `ts.findConfigFile` walks upward through parent directories, and a
 * target repo scanned from inside this monorepo (e.g.
 * `.okf-scan-cache/worktrees/<repo>-<env>/`, itself nested inside this repo) would
 * otherwise silently inherit *this* project's own tsconfig.json (and its unrelated
 * `@/*` path alias) if the target repo happened to lack one of its own — confirmed
 * to actually happen, not just a hypothetical (see this file's test for the
 * `frontend-repo` fixture, which has no tsconfig.json and sits inside this monorepo).
 */
export function loadCompilerOptions(repoDir: string): ts.CompilerOptions {
  const fallback: ts.CompilerOptions = { moduleResolution: ts.ModuleResolutionKind.NodeJs };
  const absoluteRepoDir = path.resolve(repoDir);
  const configPath = ts.findConfigFile(absoluteRepoDir, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) return fallback;

  // ts.findConfigFile only ever looks in absoluteRepoDir itself and its ancestors —
  // never subdirectories — so the only "found within this repo" case is the config
  // sitting exactly at its root.
  const isWithinRepo = path.resolve(configPath) === path.join(absoluteRepoDir, "tsconfig.json");
  if (!isWithinRepo) return fallback;

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) return fallback;
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
  return { ...fallback, ...parsed.options };
}

/**
 * Resolves an import specifier to a real file path using the repo's own compiler
 * options (so path aliases like "@src/*" work), or undefined if it can't be resolved
 * (external package, typo, etc.) — never throws.
 */
export function resolveImportedFile(
  specifier: string,
  containingFile: string,
  compilerOptions: ts.CompilerOptions
): string | undefined {
  const result = ts.resolveModuleName(specifier, containingFile, compilerOptions, ts.sys);
  return result.resolvedModule?.resolvedFileName;
}
