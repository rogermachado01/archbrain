import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadCompilerOptions, resolveImportedFile } from "./module-resolution";

const REPO_WITH_TSCONFIG = path.join(__dirname, "__fixtures__", "repo-with-tsconfig");
const REPO_WITHOUT_TSCONFIG = path.join(__dirname, "__fixtures__", "frontend-repo");

describe("loadCompilerOptions", () => {
  it("reads baseUrl/paths from the repo's own tsconfig.json", () => {
    const options = loadCompilerOptions(REPO_WITH_TSCONFIG);
    expect(options.paths).toEqual({ "@app/*": ["./lib/*"] });
  });

  it("does not use a tsconfig.json found above repoDir (e.g. this monorepo's own root config)", () => {
    const options = loadCompilerOptions(REPO_WITHOUT_TSCONFIG);
    expect(options.paths).toBeUndefined();
  });
});

describe("resolveImportedFile", () => {
  it("resolves a relative import to a real file", () => {
    const containingFile = path.join(REPO_WITH_TSCONFIG, "lib", "consumer.ts");
    const options = loadCompilerOptions(REPO_WITH_TSCONFIG);
    const resolved = resolveImportedFile("./thing", containingFile, options);
    expect(resolved && path.resolve(resolved)).toBe(path.resolve(REPO_WITH_TSCONFIG, "lib", "thing.ts"));
  });

  it("resolves a tsconfig path-aliased import", () => {
    const containingFile = path.join(REPO_WITH_TSCONFIG, "consumer.ts");
    const options = loadCompilerOptions(REPO_WITH_TSCONFIG);
    const resolved = resolveImportedFile("@app/thing", containingFile, options);
    expect(resolved && path.resolve(resolved)).toBe(path.resolve(REPO_WITH_TSCONFIG, "lib", "thing.ts"));
  });

  it("returns undefined for an import that cannot be resolved (external/nonexistent package)", () => {
    const containingFile = path.join(REPO_WITH_TSCONFIG, "lib", "consumer.ts");
    const options = loadCompilerOptions(REPO_WITH_TSCONFIG);
    expect(resolveImportedFile("some-external-ui-lib", containingFile, options)).toBeUndefined();
  });
});
