import { describe, expect, it } from "vitest";
import { resourceTypeInfo } from "./resource-types";

describe("resourceTypeInfo", () => {
  it("maps aws_lambda_function to the AWS Lambda Function label", () => {
    expect(resourceTypeInfo("aws_lambda_function")).toEqual({ label: "AWS Lambda Function" });
  });

  it("returns undefined for an unknown resource type", () => {
    expect(resourceTypeInfo("aws_totally_made_up_thing")).toBeUndefined();
  });
});
