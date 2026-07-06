import { describe, expect, it } from "vitest";
import { mergeGeneratedSatellites, satelliteBaseKey } from "./merge-generated";
import type { ConceptFacts } from "../types";

function concept(id: string, overrides: Partial<ConceptFacts> = {}): ConceptFacts {
  return { id, type: "React Component", level: "component", parentId: "app", sourceFiles: [`${id}.tsx`], ...overrides };
}

describe("satelliteBaseKey", () => {
  it("strips -gql, .generated, and stacked suffixes; leaves plain leaves alone", () => {
    expect(satelliteBaseKey("ctf-quote-gql")).toBe("ctf-quote");
    expect(satelliteBaseKey("ctf-quote.generated")).toBe("ctf-quote");
    expect(satelliteBaseKey("ctf-quote-gql.generated")).toBe("ctf-quote");
    expect(satelliteBaseKey("ctf-quote")).toBe("ctf-quote");
  });
});

describe("mergeGeneratedSatellites", () => {
  it("folds satellites into the primary: union of sourceFiles, satellites removed", () => {
    const merged = mergeGeneratedSatellites([
      concept("app/ctf-quote"),
      concept("app/ctf-quote-gql"),
      concept("app/ctf-quote.generated"),
    ]);
    expect(merged.map((c) => c.id)).toEqual(["app/ctf-quote"]);
    expect(merged[0].sourceFiles.sort()).toEqual([
      "app/ctf-quote-gql.tsx",
      "app/ctf-quote.generated.tsx",
      "app/ctf-quote.tsx",
    ]);
  });

  it("re-points other concepts' relations at the primary and dedupes by target", () => {
    const merged = mergeGeneratedSatellites([
      concept("app/page", {
        relations: [
          { targetId: "app/ctf-quote", evidence: "imports CtfQuote" },
          { targetId: "app/ctf-quote-gql", evidence: "imports CtfQuoteQuery" },
        ],
      }),
      concept("app/ctf-quote"),
      concept("app/ctf-quote-gql"),
    ]);
    const page = merged.find((c) => c.id === "app/page")!;
    expect(page.relations).toHaveLength(1);
    expect(page.relations![0].targetId).toBe("app/ctf-quote");
  });

  it("drops intra-group relations (they become self-loops after the merge)", () => {
    const merged = mergeGeneratedSatellites([
      concept("app/ctf-quote", { relations: [{ targetId: "app/ctf-quote-gql", evidence: "imports query" }] }),
      concept("app/ctf-quote-gql", { relations: [{ targetId: "app/ctf-quote.generated", evidence: "imports fragment" }] }),
      concept("app/ctf-quote.generated"),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].relations ?? []).toHaveLength(0);
  });

  it("keeps a satellite standalone when no primary concept exists", () => {
    const merged = mergeGeneratedSatellites([concept("app/post-link.generated")]);
    expect(merged.map((c) => c.id)).toEqual(["app/post-link.generated"]);
  });

  it("keeps the satellite's own outgoing relations on the primary (re-pointed, non-self)", () => {
    const merged = mergeGeneratedSatellites([
      concept("app/ctf-quote"),
      concept("app/ctf-quote-gql", { relations: [{ targetId: "app/asset", evidence: "imports AssetFragment" }] }),
      concept("app/asset"),
    ]);
    const primary = merged.find((c) => c.id === "app/ctf-quote")!;
    expect(primary.relations).toContainEqual(expect.objectContaining({ targetId: "app/asset" }));
  });
});
