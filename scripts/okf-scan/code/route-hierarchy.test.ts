import { describe, expect, it } from "vitest";
import { buildRouteHierarchy } from "./route-hierarchy";
import type { ConceptFacts } from "../types";

const APP = "web-storefront";

function app(): ConceptFacts {
  return { id: APP, type: "Frontend Application", level: "container", parentId: "platform", sourceFiles: [] };
}
function page(leaf: string, routePath: string, relations: { targetId: string }[] = []): ConceptFacts {
  return {
    id: `${APP}/${leaf}`, type: "Next.js Page", level: "component", parentId: APP, routePath,
    relations: relations.map((r) => ({ ...r, evidence: "imports" })), sourceFiles: [],
  };
}
function comp(leaf: string, relations: { targetId: string }[] = []): ConceptFacts {
  return {
    id: `${APP}/${leaf}`, type: "React Component", level: "component", parentId: APP,
    relations: relations.map((r) => ({ ...r, evidence: "imports" })), sourceFiles: [],
  };
}
const byId = (concepts: ConceptFacts[], id: string) => concepts.find((c) => c.id === id);

describe("buildRouteHierarchy", () => {
  it("promotes the app to a context-level root and pages to containers", () => {
    const result = buildRouteHierarchy([app(), page("index-page", "/")], APP);
    expect(byId(result, APP)).toMatchObject({ level: "context", parentId: null });
    expect(byId(result, `${APP}/index-page`)).toMatchObject({ level: "container", parentId: APP });
  });

  it("re-parents a component under the single page that reaches it, transitively", () => {
    const result = buildRouteHierarchy(
      [app(), page("index-page", "/", [{ targetId: `${APP}/layout` }]), comp("layout", [{ targetId: `${APP}/header` }]), comp("header")],
      APP,
    );
    expect(byId(result, `${APP}/index-page/layout`)).toMatchObject({
      parentId: `${APP}/index-page`, level: "component", usedByRoutes: ["/"],
    });
    expect(byId(result, `${APP}/index-page/header`)).toMatchObject({ parentId: `${APP}/index-page` });
  });

  it("puts a component reached by two pages, and one reached by none, under shared-ui", () => {
    const result = buildRouteHierarchy(
      [
        app(),
        page("index-page", "/", [{ targetId: `${APP}/button` }]),
        page("about", "/about", [{ targetId: `${APP}/button` }]),
        comp("button"),
        comp("orphan"),
      ],
      APP,
    );
    expect(byId(result, `${APP}/shared-ui/button`)).toMatchObject({
      parentId: `${APP}/shared-ui`, usedByRoutes: ["/", "/about"],
    });
    expect(byId(result, `${APP}/shared-ui/orphan`)).toMatchObject({ parentId: `${APP}/shared-ui` });
    expect(byId(result, `${APP}/shared-ui`)).toMatchObject({
      type: "Shared UI & Utilities", level: "container", parentId: APP,
    });
  });

  it("does not create shared-ui when every component has a unique owning page", () => {
    const result = buildRouteHierarchy(
      [app(), page("index-page", "/", [{ targetId: `${APP}/hero` }]), comp("hero")],
      APP,
    );
    expect(byId(result, `${APP}/shared-ui`)).toBeUndefined();
  });

  it("rewrites relation targets everywhere through the id map", () => {
    const result = buildRouteHierarchy(
      [app(), page("index-page", "/", [{ targetId: `${APP}/layout` }]), comp("layout")],
      APP,
    );
    const indexPage = byId(result, `${APP}/index-page`)!;
    expect(indexPage.relations![0].targetId).toBe(`${APP}/index-page/layout`);
  });

  it("leaves relation targets outside this container untouched (e.g. API concepts)", () => {
    const result = buildRouteHierarchy(
      [app(), page("index-page", "/", [{ targetId: "orders_api" }])],
      APP,
    );
    expect(byId(result, `${APP}/index-page`)!.relations![0].targetId).toBe("orders_api");
  });

  it("is a no-op for a container with no pages", () => {
    const input = [app(), comp("layout")];
    expect(buildRouteHierarchy(input, APP)).toEqual(input);
  });

  it("throws when a scanned concept already occupies the shared-ui id", () => {
    expect(() =>
      buildRouteHierarchy([app(), page("index-page", "/"), comp("shared-ui"), comp("x")], APP),
    ).toThrow(/shared-ui/);
  });
});
