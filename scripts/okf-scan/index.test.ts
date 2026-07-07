import { describe, expect, it } from "vitest";
import { parseArgs } from "./index";

describe("parseArgs", () => {
  it("parses required flags and applies concurrency defaults", () => {
    const args = parseArgs(["--repo-map", "repo-map.yaml", "--env", "dev", "--out", "public/okf-bundles/ecommerce-dev"]);
    expect(args).toEqual({
      repoMap: "repo-map.yaml",
      env: "dev",
      out: "public/okf-bundles/ecommerce-dev",
      force: false,
      concurrencyGit: 20,
      concurrencyScan: 4,
      concurrencyLlm: 6,
    });
  });

  it("parses --force and overridden concurrency flags", () => {
    const args = parseArgs([
      "--repo-map", "repo-map.yaml",
      "--env", "prd",
      "--out", "out",
      "--force",
      "--concurrency-git", "5",
    ]);
    expect(args.force).toBe(true);
    expect(args.concurrencyGit).toBe(5);
  });

  it("rejects an invalid --env value", () => {
    expect(() => parseArgs(["--repo-map", "repo-map.yaml", "--env", "staging", "--out", "out"])).toThrow(/dev, hml, prd/);
  });

  it("rejects missing required flags", () => {
    expect(() => parseArgs(["--env", "dev"])).toThrow(/Usage/);
  });

  it("parses --materialize propose", () => {
    const args = parseArgs(["--repo-map", "repo-map.yaml", "--env", "dev", "--out", "out", "--materialize", "propose"]);
    expect(args.materialize).toBe("propose");
  });

  it("parses --materialize apply with --plan", () => {
    const args = parseArgs([
      "--repo-map", "repo-map.yaml", "--env", "dev", "--out", "out",
      "--materialize", "apply", "--plan", "out/.materialize-proposal.json",
    ]);
    expect(args.materialize).toBe("apply");
    expect(args.plan).toBe("out/.materialize-proposal.json");
  });

  it("rejects an invalid --materialize value", () => {
    expect(() =>
      parseArgs(["--repo-map", "repo-map.yaml", "--env", "dev", "--out", "out", "--materialize", "nonsense"]),
    ).toThrow(/propose, apply/);
  });
});
