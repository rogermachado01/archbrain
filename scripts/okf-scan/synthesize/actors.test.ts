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

const { createAnthropicActorInferenceClient } = await import("./actors");
const AnthropicModule = (await import("@anthropic-ai/sdk")).default as unknown as {
  APIError: new (status: number, message: string) => Error;
};

function concept(id: string, type = "React Component"): ConceptFacts {
  return { id, type, level: "container", parentId: null, sourceFiles: [] };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createAnthropicActorInferenceClient", () => {
  it("parses a well-formed multi-actor response", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: [
            "ACTORS:",
            "type=Person",
            "title=Visitor",
            "description=A person browsing the site.",
            "relation_label=Browses the site",
            "relation_kind=sync",
            "",
            "type=External System",
            "title=Contentful CMS",
            "description=Headless CMS providing page content.",
            "relation_label=Fetches content via GraphQL",
            "relation_kind=sync",
          ].join("\n"),
        },
      ],
      stop_reason: "end_turn",
    });

    const client = createAnthropicActorInferenceClient("fake-key");
    const result = await client.inferActors([concept("app")]);

    expect(result).toEqual([
      { type: "Person", title: "Visitor", description: "A person browsing the site.", relationLabel: "Browses the site", relationKind: "sync" },
      { type: "External System", title: "Contentful CMS", description: "Headless CMS providing page content.", relationLabel: "Fetches content via GraphQL", relationKind: "sync" },
    ]);
  });

  it("returns an empty array when the marker is present but no actor blocks follow", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: "ACTORS:" }], stop_reason: "end_turn" });

    const client = createAnthropicActorInferenceClient("fake-key");
    const result = await client.inferActors([concept("app")]);

    expect(result).toEqual([]);
  });

  it("drops a block missing a required field", async () => {
    createMock.mockReset();
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: ["ACTORS:", "type=Person", "title=Visitor", "relation_label=Browses the site"].join("\n"),
        },
      ],
      stop_reason: "end_turn",
    });

    const client = createAnthropicActorInferenceClient("fake-key");
    const result = await client.inferActors([concept("app")]);

    expect(result).toEqual([]);
  });

  it("caps at 3 actors even if more are returned", async () => {
    createMock.mockReset();
    const block = (title: string) =>
      [`type=Person`, `title=${title}`, `description=d`, `relation_label=uses`, `relation_kind=sync`].join("\n");
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: ["ACTORS:", block("A"), "", block("B"), "", block("C"), "", block("D")].join("\n") }],
      stop_reason: "end_turn",
    });

    const client = createAnthropicActorInferenceClient("fake-key");
    const result = await client.inferActors([concept("app")]);

    expect(result).toHaveLength(3);
  });

  it("returns an empty array without calling the API when there are no concepts", async () => {
    createMock.mockReset();
    const client = createAnthropicActorInferenceClient("fake-key");
    const result = await client.inferActors([]);

    expect(result).toEqual([]);
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
            text: ["ACTORS:", "type=Person", "title=Visitor", "description=d", "relation_label=uses", "relation_kind=sync"].join("\n"),
          },
        ],
        stop_reason: "end_turn",
      });

    const client = createAnthropicActorInferenceClient("fake-key");
    const resultPromise = client.inferActors([concept("app")]);

    await vi.advanceTimersByTimeAsync(500);
    const result = await resultPromise;

    expect(result).toHaveLength(1);
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
