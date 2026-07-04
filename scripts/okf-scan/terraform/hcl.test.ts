import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseTerraformDir } from "./hcl";

const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "hcl-merge");

describe("parseTerraformDir", () => {
  it("merges resource blocks of the same type declared across multiple files", async () => {
    const { raw, fileContents } = await parseTerraformDir(FIXTURE_DIR, ["a.tf", "b.tf"]);
    const tables = (raw.resource as Record<string, Record<string, unknown>>).aws_dynamodb_table;
    expect(Object.keys(tables).sort()).toEqual(["orders_table", "payments_table"]);
    expect(Object.keys(fileContents).sort()).toEqual(["a.tf", "b.tf"]);
  });
});
