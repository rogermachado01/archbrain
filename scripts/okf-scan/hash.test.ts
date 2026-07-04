import { describe, expect, it } from "vitest";
import { hashContent, hashJson } from "./hash";

describe("hashContent", () => {
  it("returns the same hash for the same string", () => {
    expect(hashContent("hello")).toBe(hashContent("hello"));
  });

  it("returns different hashes for different strings", () => {
    expect(hashContent("hello")).not.toBe(hashContent("world"));
  });
});

describe("hashJson", () => {
  it("returns the same hash regardless of object identity", () => {
    const a = { x: 1, y: [1, 2, 3] };
    const b = { x: 1, y: [1, 2, 3] };
    expect(hashJson(a)).toBe(hashJson(b));
  });

  it("returns different hashes for different content", () => {
    expect(hashJson({ x: 1 })).not.toBe(hashJson({ x: 2 }));
  });
});
