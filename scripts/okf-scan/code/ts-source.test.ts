import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { findDescendants, listSourceFiles, parseSourceFile } from "./ts-source";

const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "source-walk");

describe("listSourceFiles", () => {
  it("lists source files while skipping node_modules", async () => {
    const files = await listSourceFiles(FIXTURE_DIR);
    expect(files).toEqual([path.join(FIXTURE_DIR, "included.ts")]);
  });
});

describe("parseSourceFile + findDescendants", () => {
  it("finds every arrow function in the file", async () => {
    const source = await parseSourceFile(path.join(FIXTURE_DIR, "included.ts"));
    const arrows = findDescendants(source, ts.isArrowFunction);
    expect(arrows).toHaveLength(2);
  });
});
