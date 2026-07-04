import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanTerraform } from "./scan-terraform";

const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "env-scan");

describe("scanTerraform", () => {
  it("extracts concepts, groups, and env-var bindings for the selected environment only", async () => {
    const result = await scanTerraform(
      { path: FIXTURE_DIR, envFiles: { dev: "dev.tf", hml: "hml.tf", prd: "prd.tf" } },
      "dev"
    );

    const ids = result.concepts.map((c) => c.id).sort();
    expect(ids).toEqual(["orders", "orders_table"]);
    expect(ids).not.toContain("orders_hml_only");

    const orders = result.concepts.find((c) => c.id === "orders")!;
    expect(orders.type).toBe("AWS Lambda Function");
    expect(orders.level).toBe("container");
    expect(orders.parentId).toBe("platform");
    expect(orders.schema?.memory_size).toBe(512);
    expect(orders.relations).toEqual([
      {
        targetId: "orders_table",
        evidence:
          "environment.variables.ORDERS_TABLE bound to ${aws_dynamodb_table.orders_table.name} in Terraform",
      },
    ]);

    expect(result.lambdaEnvVarBindings.orders).toEqual({ ORDERS_TABLE: "aws_dynamodb_table.orders_table" });

    const vpc = result.groups.find((g) => g.id === "vpc-main")!;
    expect(vpc.kind).toBe("vpc");
    const subnet = result.groups.find((g) => g.id === "subnet-private_a")!;
    expect(subnet.parentGroupId).toBe("vpc-main");
    expect(subnet.subnetType).toBe("private");
  });
});
