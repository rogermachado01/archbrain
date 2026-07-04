import { afterEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => {
  vi.useRealTimers();
});

describe("createAnthropicLlmClient", () => {
  it("returns the trimmed text content from a successful call", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "  A DynamoDB table.  " }],
      stop_reason: "end_turn",
    });

    const client = createAnthropicLlmClient("fake-key");
    const prose = await client.describeConcept(facts);

    expect(prose).toBe("A DynamoDB table.");
  });

  it("retries once on a 429 rate-limit error and then succeeds", async () => {
    vi.useFakeTimers();
    createMock.mockReset();
    createMock
      .mockRejectedValueOnce(new AnthropicModule.APIError(429, "rate limited"))
      .mockResolvedValueOnce({ content: [{ type: "text", text: "Recovered." }], stop_reason: "end_turn" });

    const client = createAnthropicLlmClient("fake-key");
    const prosePromise = client.describeConcept(facts);

    await vi.advanceTimersByTimeAsync(500);
    const prose = await prosePromise;

    expect(prose).toBe("Recovered.");
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("throws immediately when no API key is available", () => {
    expect(() => createAnthropicLlmClient(undefined)).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("does not retry a non-429 Anthropic API error and rethrows immediately", async () => {
    createMock.mockReset();
    const serverError = new AnthropicModule.APIError(500, "server error");
    createMock.mockRejectedValueOnce(serverError);

    const client = createAnthropicLlmClient("fake-key");

    await expect(client.describeConcept(facts)).rejects.toBe(serverError);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a plain Error and rethrows immediately", async () => {
    createMock.mockReset();
    const genericError = new Error("boom");
    createMock.mockRejectedValueOnce(genericError);

    const client = createAnthropicLlmClient("fake-key");

    await expect(client.describeConcept(facts)).rejects.toBe(genericError);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("stops retrying after MAX_ATTEMPTS 429s and surfaces the final error", async () => {
    vi.useFakeTimers();
    createMock.mockReset();
    const rateLimitError = new AnthropicModule.APIError(429, "rate limited");
    createMock.mockRejectedValue(rateLimitError);

    const client = createAnthropicLlmClient("fake-key");
    const prosePromise = client.describeConcept(facts);
    // Prevent an unhandled-rejection warning while we advance fake timers below.
    prosePromise.catch(() => {});

    // Backoffs are 2**attempt * 500ms: attempt 0 -> 500ms, attempt 1 -> 1000ms.
    // The 3rd (final) attempt throws immediately with no further backoff.
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(prosePromise).rejects.toBe(rateLimitError);
    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it("throws when the response has no content blocks at all", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({ content: [], stop_reason: "end_turn" });

    const client = createAnthropicLlmClient("fake-key");

    await expect(client.describeConcept(facts)).rejects.toThrow("LLM response had no text content");
  });

  it("throws when the response has only a non-text content block", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "toolu_1", name: "noop", input: {} }],
      stop_reason: "end_turn",
    });

    const client = createAnthropicLlmClient("fake-key");

    await expect(client.describeConcept(facts)).rejects.toThrow("LLM response had no text content");
  });

  it("throws a clear error when the response was truncated by max_tokens", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "this got cut off halfway" }],
      stop_reason: "max_tokens",
    });

    const client = createAnthropicLlmClient("fake-key");

    await expect(client.describeConcept(facts)).rejects.toThrow("LLM response was truncated by max_tokens");
    // Truncation isn't a rate limit, so it should not be retried.
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("keeps a blank line between facts and the final instruction when optional facts are omitted", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" });

    const minimalFacts: ConceptFacts = {
      id: "orders_table",
      type: "Amazon DynamoDB Table",
      level: "container",
      parentId: "platform",
      sourceFiles: [],
      // awsResourceType, schema, and relations all omitted
    };

    const client = createAnthropicLlmClient("fake-key");
    await client.describeConcept(minimalFacts);

    const sentPrompt = createMock.mock.calls[0][0].messages[0].content as string;
    const lines = sentPrompt.split("\n");
    const instructionIndex = lines.findIndex((line) => line.startsWith("Write 1-3 short paragraphs"));

    expect(instructionIndex).toBeGreaterThan(0);
    expect(lines[instructionIndex - 1]).toBe("");
  });

  it("disables thinking and raises max_tokens on every call", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" });

    const client = createAnthropicLlmClient("fake-key");
    await client.describeConcept(facts);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 1024, thinking: { type: "disabled" } }),
    );
  });
});
