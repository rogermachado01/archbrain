import path from "node:path";
import { describe, expect, it } from "vitest";
import { ownerForFile } from "./codeowners";

const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "codeowners-repo");

describe("ownerForFile", () => {
  it("uses the most specific matching rule (last match wins, matching GitHub's own precedence)", async () => {
    const ordersOwner = await ownerForFile(FIXTURE_DIR, path.join(FIXTURE_DIR, "src", "orders", "handler.ts"));
    expect(ordersOwner).toBe("orders-team");

    const fallbackOwner = await ownerForFile(FIXTURE_DIR, path.join(FIXTURE_DIR, "src", "other", "file.ts"));
    expect(fallbackOwner).toBe("platform-team");
  });

  it("returns undefined when there is no CODEOWNERS file", async () => {
    const owner = await ownerForFile(path.join(FIXTURE_DIR, "..", "lambda-repo"), path.join(FIXTURE_DIR, "handler.ts"));
    expect(owner).toBeUndefined();
  });
});
