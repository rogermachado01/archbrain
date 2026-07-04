import { parse as parseHcl } from "@cdktf/hcl2json";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface ParsedTerraform {
  raw: Record<string, unknown>;
  /** filename -> raw file text, kept around so callers can hash inputs */
  fileContents: Record<string, string>;
}

/** Shallow-merges two hcl2json outputs one level past the block-type key (e.g. `resource.aws_lambda_function.<name>`). */
function mergeHclJson(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...a };
  for (const [topKey, bVal] of Object.entries(b)) {
    if (typeof bVal !== "object" || bVal === null || Array.isArray(bVal)) {
      result[topKey] = bVal;
      continue;
    }
    const aVal = (result[topKey] ?? {}) as Record<string, unknown>;
    const mergedSection: Record<string, unknown> = { ...aVal };
    for (const [subKey, subVal] of Object.entries(bVal as Record<string, unknown>)) {
      if (typeof subVal !== "object" || subVal === null || Array.isArray(subVal)) {
        mergedSection[subKey] = subVal;
        continue;
      }
      mergedSection[subKey] = { ...(aVal[subKey] as object | undefined), ...(subVal as object) };
    }
    result[topKey] = mergedSection;
  }
  return result;
}

/** Parses every named `.tf` file in `dir` (no `terraform init`, no state, no credentials) and merges them. */
export async function parseTerraformDir(dir: string, files: string[]): Promise<ParsedTerraform> {
  const fileContents: Record<string, string> = {};
  let merged: Record<string, unknown> = {};
  for (const file of files) {
    const content = await readFile(path.join(dir, file), "utf-8");
    fileContents[file] = content;
    const json = (await parseHcl(file, content)) as Record<string, unknown>;
    merged = mergeHclJson(merged, json);
  }
  return { raw: merged, fileContents };
}
