import { describe, expect, it } from "vitest";
import { parseScanRequest } from "./api-helpers";

describe("parseScanRequest", () => {
  const repoMap = { frontend: [{ repo: "../web-storefront", branch: { dev: "develop", hml: "staging", prd: "main" } }] };

  it("applies concurrency defaults when omitted", () => {
    const fields = parseScanRequest({ repoMap, env: "dev", out: "public/okf-bundles/test" });
    expect(fields).toEqual({
      repoMap,
      env: "dev",
      out: "public/okf-bundles/test",
      force: false,
      concurrencyGit: 20,
      concurrencyScan: 4,
      concurrencyLlm: 6,
    });
  });

  it("rejects a missing repoMap", () => {
    expect(() => parseScanRequest({ env: "dev", out: "out" })).toThrow(/repoMap/);
  });

  it("rejects an invalid env", () => {
    expect(() => parseScanRequest({ repoMap, env: "staging", out: "out" })).toThrow(/dev, hml, prd/);
  });

  it("rejects a missing out", () => {
    expect(() => parseScanRequest({ repoMap, env: "dev" })).toThrow(/out/);
  });

  it("passes through force and overridden concurrency", () => {
    const fields = parseScanRequest({ repoMap, env: "prd", out: "out", force: true, concurrencyGit: 5 });
    expect(fields.force).toBe(true);
    expect(fields.concurrencyGit).toBe(5);
  });
});
