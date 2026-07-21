import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ConceptFacts, ScanResult } from "../types";
import type { ContextAssignment } from "./organize";
import type { ActorProposal } from "./actors";
import {
  applyMaterializationPlan,
  applyMaterializationProposal,
  computeMaterializationPlan,
  proposeMaterialization,
  proposalPath,
  readProposal,
  writeProposal,
} from "./materialize";

function component(id: string, context: string, relations?: ConceptFacts["relations"]): ConceptFacts {
  return { id, type: "React Component", level: "component", parentId: "app/shared-ui", relations, sourceFiles: [] };
}

describe("computeMaterializationPlan", () => {
  it("returns null when the container has fewer children than the materialize threshold", () => {
    const children = Array.from({ length: 5 }, (_, i) => component(`app/small/c${i}`, i < 2 ? "A" : "B"));
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 2 ? "A" : "B" }));
    expect(computeMaterializationPlan("app/small", children, assignments, children)).toBeNull();
  });

  it("returns null when the organizer produced only one distinct group", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, "Everything"));
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c) => (assignments[c.id] = { context: "Everything" }));
    expect(computeMaterializationPlan("app/shared-ui", children, assignments, children)).toBeNull();
  });

  it("groups children into capability sub-containers and remaps their ids", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));

    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children);
    expect(plan?.groups).toHaveLength(2);
    expect(plan?.idRemap["app/shared-ui/c0"]).toBe("app/shared-ui/navigation/c0");
    expect(plan?.idRemap["app/shared-ui/c8"]).toBe("app/shared-ui/content/c8");
  });

  it("promotes a single-member group referenced by 3+ other groups to a sibling of the container instead of wrapping it", () => {
    const children = Array.from({ length: 15 }, (_, i) => {
      if (i < 5) return component(`app/shared-ui/c${i}`, "A");
      if (i < 10) return component(`app/shared-ui/c${i}`, "B");
      if (i < 14) return component(`app/shared-ui/c${i}`, "C");
      return component(`app/shared-ui/c${i}`, "Theme");
    });
    children[0].relations = [{ targetId: "app/shared-ui/c14", evidence: "imports theme" }];
    children[5].relations = [{ targetId: "app/shared-ui/c14", evidence: "imports theme" }];
    children[10].relations = [{ targetId: "app/shared-ui/c14", evidence: "imports theme" }];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => {
      assignments[c.id] = { context: i < 5 ? "A" : i < 10 ? "B" : i < 14 ? "C" : "Theme" };
    });

    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children);
    const themeGroup = plan?.groups.find((g) => g.contextName === "Theme");
    expect(themeGroup?.promoted).toBe(true);
    expect(plan?.idRemap["app/shared-ui/c14"]).toBe("app/c14");
  });

  it("does not promote a single-member group with fewer than 3 external referrers", () => {
    const children = Array.from({ length: 15 }, (_, i) => {
      if (i < 5) return component(`app/shared-ui/c${i}`, "A");
      if (i < 10) return component(`app/shared-ui/c${i}`, "B");
      if (i < 14) return component(`app/shared-ui/c${i}`, "C");
      return component(`app/shared-ui/c${i}`, "Theme");
    });
    children[0].relations = [{ targetId: "app/shared-ui/c14", evidence: "imports theme" }];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => {
      assignments[c.id] = { context: i < 5 ? "A" : i < 10 ? "B" : i < 14 ? "C" : "Theme" };
    });

    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children);
    const themeGroup = plan?.groups.find((g) => g.contextName === "Theme");
    expect(themeGroup?.promoted).toBe(false);
    expect(plan?.idRemap["app/shared-ui/c14"]).toBe("app/shared-ui/theme/c14");
  });

  it("never promotes a single-member group in a top-level container (nowhere to promote to)", () => {
    const children = Array.from({ length: 15 }, (_, i) => {
      const id = `shared-ui/c${i}`;
      if (i < 5) return { ...component(id, "A"), parentId: "shared-ui" };
      if (i < 10) return { ...component(id, "B"), parentId: "shared-ui" };
      if (i < 14) return { ...component(id, "C"), parentId: "shared-ui" };
      return { ...component(id, "Theme"), parentId: "shared-ui" };
    });
    children[0].relations = [{ targetId: "shared-ui/c14", evidence: "x" }];
    children[5].relations = [{ targetId: "shared-ui/c14", evidence: "x" }];
    children[10].relations = [{ targetId: "shared-ui/c14", evidence: "x" }];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => {
      assignments[c.id] = { context: i < 5 ? "A" : i < 10 ? "B" : i < 14 ? "C" : "Theme" };
    });

    const plan = computeMaterializationPlan("shared-ui", children, assignments, children);
    expect(plan?.groups.find((g) => g.contextName === "Theme")?.promoted).toBe(false);
  });

  it("strips diacritics when slugifying a context name instead of collapsing each accented letter into a hyphen", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "São Paulo" : "Other"));
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "São Paulo" : "Other" }));

    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children);
    expect(plan?.idRemap["app/shared-ui/c0"]).toBe("app/shared-ui/sao-paulo/c0");
  });

  it("appends a numeric suffix when two distinct context names slugify to the same string, keeping container ids unique", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "UI/UX" : "UI UX"));
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "UI/UX" : "UI UX" }));

    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children);
    expect(plan?.groups).toHaveLength(2);
    const containerIds = plan!.groups.map((g) => g.containerId);
    expect(new Set(containerIds).size).toBe(2);
    expect(containerIds).toContain("app/shared-ui/ui-ux");
    expect(containerIds).toContain("app/shared-ui/ui-ux-2");
  });

  it("ignores a relation whose target isn't any known concept (dangling/external reference) rather than crashing or miscounting referrers", () => {
    const children = Array.from({ length: 15 }, (_, i) => {
      if (i < 5) return component(`app/shared-ui/c${i}`, "A");
      if (i < 10) return component(`app/shared-ui/c${i}`, "B");
      if (i < 14) return component(`app/shared-ui/c${i}`, "C");
      return component(`app/shared-ui/c${i}`, "Theme");
    });
    // Only 2 real cross-group referrers of the sole Theme member — below the promotion
    // threshold — plus a third relation pointing at an id that doesn't belong to any
    // known concept at all, simulating a dangling/external reference.
    children[0].relations = [{ targetId: "app/shared-ui/c14", evidence: "imports theme" }];
    children[5].relations = [{ targetId: "app/shared-ui/c14", evidence: "imports theme" }];
    children[10].relations = [{ targetId: "some-external-package/not-a-known-concept", evidence: "external import" }];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => {
      assignments[c.id] = { context: i < 5 ? "A" : i < 10 ? "B" : i < 14 ? "C" : "Theme" };
    });

    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children);
    const themeGroup = plan?.groups.find((g) => g.contextName === "Theme");
    expect(themeGroup?.promoted).toBe(false);
    expect(plan?.idRemap["app/shared-ui/c14"]).toBe("app/shared-ui/theme/c14");
  });

  it("leaves a child with no assignment entry untouched — no idRemap entry, not counted into any group", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const assignments: Record<string, ContextAssignment> = {};
    // c0 is deliberately left out of `assignments` entirely (not just missing a `context`
    // field) — simulates the organizer's free-text response omitting a child outright.
    children.slice(1).forEach((c, i) => (assignments[c.id] = { context: i < 7 ? "Navigation" : "Content" }));

    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children);
    expect(plan?.idRemap["app/shared-ui/c0"]).toBeUndefined();
    expect(plan?.groups.every((g) => !g.memberIds.includes("app/shared-ui/c0"))).toBe(true);
  });
});

describe("applyMaterializationPlan", () => {
  it("rewrites member ids/parentIds and remaps their relation targetIds", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    children[0].relations = [{ targetId: "app/shared-ui/c8", evidence: "imports" }];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children)!;

    const result = applyMaterializationPlan(children, plan);
    const c0 = result.find((c) => c.id === "app/shared-ui/navigation/c0")!;
    expect(c0.parentId).toBe("app/shared-ui/navigation");
    expect(c0.relations?.[0].targetId).toBe("app/shared-ui/content/c8");
  });

  it("creates one new capability container per non-promoted group, parented under the original container", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children)!;

    const result = applyMaterializationPlan(children, plan);
    const navContainer = result.find((c) => c.id === "app/shared-ui/navigation")!;
    expect(navContainer.parentId).toBe("app/shared-ui");
    expect(navContainer.type).toBe("UI Capability");
    // `allConcepts` here doesn't include a facts entry for "app/shared-ui"
    // itself, so its level is unknown and the wrapper falls back to the
    // pre-existing default of "container" (see the next test for the case
    // where the container's own level IS known and isn't "context").
    expect(navContainer.level).toBe("container");
  });

  it("dissolves an already-\"container\"-level concept (e.g. a frontend's synthetic shared-ui container) into sibling containers instead of nesting a container-in-container", () => {
    // Mirrors route-hierarchy.ts's real output: a synthetic "shared-ui"
    // container (level "container", child of the app's context-level root)
    // whose own children are "component"-level React components. The C4
    // model here is a strict 3-level stack (context -> container ->
    // component, see validate-model.ts) with no level below "component" — so
    // there's no room to nest a wrapper "container" below an already-
    // "container"-level parent while still leaving its members one level
    // further down. Every group must instead become a full sibling of
    // "app/shared-ui" (replacing it), exactly the shape a human curator
    // produced by hand for the reference "blog2" bundle.
    const sharedUi: ConceptFacts = {
      id: "app/shared-ui",
      type: "Shared UI & Utilities",
      level: "container",
      parentId: "app",
      sourceFiles: [],
    };
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const allConcepts = [sharedUi, ...children];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, allConcepts)!;

    const result = applyMaterializationPlan(allConcepts, plan);
    const navContainer = result.find((c) => c.id === "app/navigation")!;
    expect(navContainer.level).toBe("container");
    expect(navContainer.parentId).toBe("app");
    const c0 = result.find((c) => c.id === "app/navigation/c0")!;
    expect(c0.level).toBe("component");
    expect(c0.parentId).toBe("app/navigation");
    // The dissolved "app/shared-ui" concept must be gone entirely — it has no
    // members left, and nothing should render an empty leaf node for it.
    expect(result.find((c) => c.id === "app/shared-ui")).toBeUndefined();
  });

  it("aggregates cross-group relations onto the new capability containers, deduplicated by target group", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    children[0].relations = [{ targetId: "app/shared-ui/c8", evidence: "imports" }];
    children[1].relations = [{ targetId: "app/shared-ui/c9", evidence: "also imports" }];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children)!;

    const result = applyMaterializationPlan(children, plan);
    const navContainer = result.find((c) => c.id === "app/shared-ui/navigation")!;
    expect(navContainer.relations).toHaveLength(1);
    expect(navContainer.relations?.[0].targetId).toBe("app/shared-ui/content");
  });

  it("does not create a synthetic wrapper container for a promoted single-member group", () => {
    const children = Array.from({ length: 15 }, (_, i) => {
      if (i < 5) return component(`app/shared-ui/c${i}`, "A");
      if (i < 10) return component(`app/shared-ui/c${i}`, "B");
      if (i < 14) return component(`app/shared-ui/c${i}`, "C");
      return component(`app/shared-ui/c${i}`, "Theme");
    });
    children[0].relations = [{ targetId: "app/shared-ui/c14", evidence: "x" }];
    children[5].relations = [{ targetId: "app/shared-ui/c14", evidence: "x" }];
    children[10].relations = [{ targetId: "app/shared-ui/c14", evidence: "x" }];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => {
      assignments[c.id] = { context: i < 5 ? "A" : i < 10 ? "B" : i < 14 ? "C" : "Theme" };
    });
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children)!;

    const result = applyMaterializationPlan(children, plan);
    expect(result.find((c) => c.id === "app/shared-ui/theme")).toBeUndefined();
    const promoted = result.find((c) => c.id === "app/c14")!;
    expect(promoted.parentId).toBe("app");
  });

  it("remaps a relation from a concept outside the materialized container into a moved concept", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const outsideConcept: ConceptFacts = {
      id: "app/route",
      type: "Next.js Page",
      level: "container",
      parentId: "app",
      relations: [{ targetId: "app/shared-ui/c0", evidence: "renders" }],
      sourceFiles: [],
    };
    const allConcepts = [...children, outsideConcept];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, allConcepts)!;

    const result = applyMaterializationPlan(allConcepts, plan);
    const route = result.find((c) => c.id === "app/route")!;
    expect(route.relations?.[0].targetId).toBe("app/shared-ui/navigation/c0");
  });

  it("passes an unrelated concept through unchanged", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const unrelated: ConceptFacts = { id: "app/other-page", type: "Next.js Page", level: "container", parentId: "app", sourceFiles: [] };
    const allConcepts = [...children, unrelated];
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, allConcepts)!;

    const result = applyMaterializationPlan(allConcepts, plan);
    expect(result.find((c) => c.id === "app/other-page")).toBe(unrelated);
  });

  it("throws a clear error when idRemap references an id missing from every group's memberIds", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children)!;
    const corrupted = { ...plan, idRemap: { ...plan.idRemap, "app/shared-ui/ghost": "app/shared-ui/navigation/ghost" } };

    expect(() => applyMaterializationPlan(children, corrupted)).toThrow(/idRemap has an entry for "app\/shared-ui\/ghost"/);
  });

  it("throws a clear error when a group's memberIds references an id missing from idRemap", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, children)!;
    const { "app/shared-ui/c0": _dropped, ...remainingRemap } = plan.idRemap;
    const corrupted = { ...plan, idRemap: remainingRemap };

    expect(() => applyMaterializationPlan(children, corrupted)).toThrow(/idRemap has no entry for it/);
  });
});

describe("applyMaterializationProposal", () => {
  it("wires a Person actor's own relation to the single root concept", () => {
    const root: ConceptFacts = { id: "app", type: "Frontend Application", level: "context", parentId: null, sourceFiles: [] };
    const scanResult: ScanResult = { concepts: [root], groups: [], lambdaEnvVarBindings: {} };
    const proposal = {
      containerPlans: [],
      actorProposals: [
        { type: "Person" as const, title: "Visitor", description: "d", relationLabel: "Browses the site", relationKind: "sync" as const },
      ],
    };

    const result = applyMaterializationProposal(scanResult, proposal);
    const visitor = result.concepts.find((c) => c.id === "visitor")!;
    expect(visitor.type).toBe("Person");
    expect(visitor.external).toBe(true);
    expect(visitor.relations).toEqual([{ targetId: "app", label: "Browses the site", kind: "sync", evidence: "Browses the site" }]);
  });

  it("wires an External System actor's relation onto the root concept instead of the actor itself", () => {
    const root: ConceptFacts = { id: "app", type: "Frontend Application", level: "context", parentId: null, sourceFiles: [] };
    const scanResult: ScanResult = { concepts: [root], groups: [], lambdaEnvVarBindings: {} };
    const proposal = {
      containerPlans: [],
      actorProposals: [
        { type: "External System" as const, title: "Contentful CMS", description: "d", relationLabel: "Fetches content via GraphQL", relationKind: "sync" as const },
      ],
    };

    const result = applyMaterializationProposal(scanResult, proposal);
    const cms = result.concepts.find((c) => c.id === "contentful-cms")!;
    expect(cms.relations).toBeUndefined();
    const rootAfter = result.concepts.find((c) => c.id === "app")!;
    expect(rootAfter.relations).toEqual([{ targetId: "contentful-cms", label: "Fetches content via GraphQL", kind: "sync", evidence: "Fetches content via GraphQL" }]);
  });

  it("skips wiring any relation when there isn't exactly one top-level concept", () => {
    const scanResult: ScanResult = {
      concepts: [
        { id: "a", type: "X", level: "context", parentId: null, sourceFiles: [] },
        { id: "b", type: "X", level: "context", parentId: null, sourceFiles: [] },
      ],
      groups: [],
      lambdaEnvVarBindings: {},
    };
    const proposal = {
      containerPlans: [],
      actorProposals: [{ type: "Person" as const, title: "Visitor", description: "d", relationLabel: "uses", relationKind: "sync" as const }],
    };

    const result = applyMaterializationProposal(scanResult, proposal);
    const visitor = result.concepts.find((c) => c.id === "visitor")!;
    expect(visitor.relations).toBeUndefined();
    expect(result.concepts.find((c) => c.id === "a")?.relations).toBeUndefined();
  });

  it("dedupes a synthesized actor id that would otherwise collide with an existing concept id", () => {
    const root: ConceptFacts = { id: "app", type: "Frontend Application", level: "context", parentId: null, sourceFiles: [] };
    const existingVisitor: ConceptFacts = { id: "visitor", type: "React Component", level: "component", parentId: "app", sourceFiles: [] };
    const scanResult: ScanResult = { concepts: [root, existingVisitor], groups: [], lambdaEnvVarBindings: {} };
    const proposal = {
      containerPlans: [],
      actorProposals: [
        { type: "Person" as const, title: "Visitor", description: "d", relationLabel: "Browses the site", relationKind: "sync" as const },
      ],
    };

    const result = applyMaterializationProposal(scanResult, proposal);
    const newActor = result.concepts.find((c) => c.type === "Person");
    expect(newActor?.id).toBe("visitor-2");
    expect(result.concepts.filter((c) => c.id === "visitor")).toHaveLength(1);
  });

  it("applies every container plan in the proposal", () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const root: ConceptFacts = { id: "app", type: "Frontend Application", level: "context", parentId: null, sourceFiles: [] };
    const scanResult: ScanResult = { concepts: [root, ...children], groups: [], lambdaEnvVarBindings: {} };
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const plan = computeMaterializationPlan("app/shared-ui", children, assignments, [root, ...children])!;

    const result = applyMaterializationProposal(scanResult, { containerPlans: [plan], actorProposals: [] });
    expect(result.concepts.find((c) => c.id === "app/shared-ui/navigation/c0")).toBeDefined();
  });
});

describe("proposal file I/O", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "okf-scan-materialize-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips a proposal through writeProposal/readProposal", async () => {
    const proposal = {
      containerPlans: [],
      actorProposals: [{ type: "Person" as const, title: "Visitor", description: "d", relationLabel: "uses", relationKind: "sync" as const }] as ActorProposal[],
    };
    await writeProposal(dir, proposal);
    const loaded = await readProposal(dir);
    expect(loaded).toEqual(proposal);
  });
});

describe("proposeMaterialization", () => {
  it("skips a container id already in the alreadyMaterialized set", async () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, "Everything"));
    const scanResult: ScanResult = { concepts: children, groups: [], lambdaEnvVarBindings: {} };
    const organizeChildren = vi.fn().mockResolvedValue({});
    const inferActors = vi.fn().mockResolvedValue([]);

    const proposal = await proposeMaterialization(
      scanResult,
      { organizeChildren },
      { inferActors },
      new Set(["app/shared-ui"]),
    );

    expect(organizeChildren).not.toHaveBeenCalled();
    expect(proposal.containerPlans).toEqual([]);
  });

  it("calls the organizer for an eligible container and includes its plan when one is produced", async () => {
    const children = Array.from({ length: 16 }, (_, i) => component(`app/shared-ui/c${i}`, i < 8 ? "Navigation" : "Content"));
    const scanResult: ScanResult = { concepts: children, groups: [], lambdaEnvVarBindings: {} };
    const assignments: Record<string, ContextAssignment> = {};
    children.forEach((c, i) => (assignments[c.id] = { context: i < 8 ? "Navigation" : "Content" }));
    const organizeChildren = vi.fn().mockResolvedValue(assignments);
    const inferActors = vi.fn().mockResolvedValue([]);

    const proposal = await proposeMaterialization(scanResult, { organizeChildren }, { inferActors }, new Set());

    expect(organizeChildren).toHaveBeenCalledWith("app/shared-ui", children.map((c) => ({ facts: c })));
    expect(proposal.containerPlans).toHaveLength(1);
  });
});
