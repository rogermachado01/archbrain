import { describe, expect, it } from "vitest";
import type { ConceptFacts } from "../types";
import type { ContextAssignment } from "./organize";
import { computeMaterializationPlan } from "./materialize";

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
});
