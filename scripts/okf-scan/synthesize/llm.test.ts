import { describe, expect, it, vi } from "vitest";
import type { ConceptFacts } from "../types";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class FakeAPIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  class FakeAnthropic {
    messages = { create: createMock };
    static APIError = FakeAPIError;
  }
  return { default: FakeAnthropic };
});

const { createAnthropicLlmClient } = await import("./llm");
const AnthropicModule = (await import("@anthropic-ai/sdk")).default as unknown as {
  APIError: new (status: number, message: string) => Error;
};

const facts: ConceptFacts = {
  id: "orders_table",
  type: "Amazon DynamoDB Table",
  level: "container",
  parentId: "platform",
  sourceFiles: [],
};

describe("createAnthropicLlmClient", () => {
  it("returns the trimmed text content from a successful call", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: "  A DynamoDB table.  " }] });

    const client = createAnthropicLlmClient("fake-key");
    const prose = await client.describeConcept(facts);

    expect(prose).toBe("A DynamoDB table.");
  });

  it("retries once on a 429 rate-limit error and then succeeds", async () => {
    createMock.mockReset();
    createMock
      .mockRejectedValueOnce(new AnthropicModule.APIError(429, "rate limited"))
      .mockResolvedValueOnce({ content: [{ type: "text", text: "Recovered." }] });

    const client = createAnthropicLlmClient("fake-key");
    const prose = await client.describeConcept(facts);

    expect(prose).toBe("Recovered.");
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("throws immediately when no API key is available", () => {
    expect(() => createAnthropicLlmClient(undefined)).toThrow(/ANTHROPIC_API_KEY/);
  });
});
