import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadRepoMap } from "./repo-map";

const FIXTURE = path.join(__dirname, "__fixtures__", "repo-map.example.yaml");

describe("loadRepoMap", () => {
  it("parses a valid repo-map.yaml", async () => {
    const config = await loadRepoMap(FIXTURE);
    expect(config.terraform.path).toBe("../infra-terraform");
    expect(config.terraform.envFiles.dev).toBe("dev.tf");
    expect(config.resources["aws_lambda_function.orders"].repo).toBe("../orders-service");
    expect(config.resources["aws_lambda_function.orders"].branch.hml).toBe("staging");
    expect(config.frontend).toHaveLength(1);
    expect(config.frontend[0].repo).toBe("../web-storefront");
  });

  it("throws a descriptive error when a required field is missing", async () => {
    await expect(loadRepoMap(path.join(__dirname, "__fixtures__", "repo-map.missing-field.yaml"))).rejects.toThrow(
      /repo-map/i
    );
  });
});
