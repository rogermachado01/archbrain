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

const { createAnthropicOrganizerClient } = await import("./organize");
const AnthropicModule = (await import("@anthropic-ai/sdk")).default as unknown as {
  APIError: new (status: number, message: string) => Error;
};

function concept(id: string): ConceptFacts {
  return { id, type: "React Component", level: "component", parentId: "web-storefront", sourceFiles: [] };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createAnthropicOrganizerClient", () => {
  it("parses a well-formed multi-child response", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: [
            "CONTEXT ASSIGNMENTS:",
            "web-storefront/header: context=Navigation | subdomain=supporting | role=Presentational Component",
            "web-storefront/footer: context=Navigation | subdomain=supporting | role=Presentational Component",
          ].join("\n"),
        },
      ],
      stop_reason: "end_turn",
    });

    const client = createAnthropicOrganizerClient("fake-key");
    const result = await client.organizeChildren("web-storefront", [
      { facts: concept("web-storefront/header") },
      { facts: concept("web-storefront/footer") },
    ]);

    expect(result).toEqual({
      "web-storefront/header": { context: "Navigation", subdomain: "supporting", role: "Presentational Component" },
      "web-storefront/footer": { context: "Navigation", subdomain: "supporting", role: "Presentational Component" },
    });
  });

  it("omits a child whose line is missing from the response, without affecting the others", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: ["CONTEXT ASSIGNMENTS:", "web-storefront/header: context=Navigation | subdomain=supporting | role=Header"].join(
            "\n",
          ),
        },
      ],
      stop_reason: "end_turn",
    });

    const client = createAnthropicOrganizerClient("fake-key");
    const result = await client.organizeChildren("web-storefront", [
      { facts: concept("web-storefront/header") },
      { facts: concept("web-storefront/footer") },
    ]);

    expect(result).toEqual({
      "web-storefront/header": { context: "Navigation", subdomain: "supporting", role: "Header" },
    });
    expect(result["web-storefront/footer"]).toBeUndefined();
  });

  it("drops a subdomain value outside the core/supporting/generic enum, keeping context and role", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [
        { type: "text", text: ["CONTEXT ASSIGNMENTS:", "web-storefront/header: context=Navigation | subdomain=weird | role=Header"].join("\n") },
      ],
      stop_reason: "end_turn",
    });

    const client = createAnthropicOrganizerClient("fake-key");
    const result = await client.organizeChildren("web-storefront", [{ facts: concept("web-storefront/header") }]);

    expect(result).toEqual({ "web-storefront/header": { context: "Navigation", role: "Header" } });
  });

  it("includes an existingContext anchor in the prompt sent to the model", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: "CONTEXT ASSIGNMENTS:\nweb-storefront/header: context=Navigation | subdomain=supporting | role=Header",
        },
      ],
      stop_reason: "end_turn",
    });

    const client = createAnthropicOrganizerClient("fake-key");
    await client.organizeChildren("web-storefront", [
      { facts: concept("web-storefront/header"), existingContext: "Navigation" },
    ]);

    const sentPrompt = createMock.mock.calls[0][0].messages[0].content as string;
    expect(sentPrompt).toContain('already assigned to group "Navigation"');
  });

  it("returns an empty object without calling the API when there are no children", async () => {
    createMock.mockReset();
    const client = createAnthropicOrganizerClient("fake-key");
    const result = await client.organizeChildren("web-storefront", []);

    expect(result).toEqual({});
    expect(createMock).not.toHaveBeenCalled();
  });

  it("retries once on a 429 rate-limit error and then succeeds", async () => {
    vi.useFakeTimers();
    createMock.mockReset();
    createMock
      .mockRejectedValueOnce(new AnthropicModule.APIError(429, "rate limited"))
      .mockResolvedValueOnce({
        content: [
          {
            type: "text",
            text: "CONTEXT ASSIGNMENTS:\nweb-storefront/header: context=Navigation | subdomain=supporting | role=Header",
          },
        ],
        stop_reason: "end_turn",
      });

    const client = createAnthropicOrganizerClient("fake-key");
    const resultPromise = client.organizeChildren("web-storefront", [{ facts: concept("web-storefront/header") }]);

    await vi.advanceTimersByTimeAsync(500);
    const result = await resultPromise;

    expect(result).toEqual({ "web-storefront/header": { context: "Navigation", subdomain: "supporting", role: "Header" } });
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
