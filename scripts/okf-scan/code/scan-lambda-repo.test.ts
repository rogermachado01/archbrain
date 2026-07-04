import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanLambdaRepo } from "./scan-lambda-repo";

const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "lambda-repo");

describe("scanLambdaRepo", () => {
  it("finds the handler and resolves an env-var-bound SDK call to its Terraform target", async () => {
    const concepts = await scanLambdaRepo({
      repoDir: FIXTURE_DIR,
      containerId: "orders",
      envVarBindings: { ORDERS_TABLE: "aws_dynamodb_table.orders_table" },
    });

    expect(concepts).toHaveLength(1);
    const [handler] = concepts;
    expect(handler.id).toBe("orders/handler");
    expect(handler.level).toBe("component");
    expect(handler.parentId).toBe("orders");
    expect(handler.relations).toEqual([
      {
        targetId: "orders_table",
        kind: "sync",
        evidence: "PutItemCommand + env var ORDERS_TABLE bound in Terraform to aws_dynamodb_table.orders_table",
      },
    ]);
    expect(handler.needsReview).toEqual([
      'SendMessageCommand\'s QueueUrl is a literal value ("https://literal-queue-url") — not resolved to a concept id automatically',
    ]);
  });
});
