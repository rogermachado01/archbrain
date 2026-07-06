import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT_CONTEXT_ID } from "../types";
import { scanFrontendRepo } from "./scan-frontend-repo";

const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "frontend-repo");
const NEXTJS_FIXTURE_DIR = path.join(__dirname, "__fixtures__", "nextjs-repo");

describe("scanFrontendRepo", () => {
  it("emits a container concept for the repo itself, parented to the root context", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: { "https://api.example.com/orders": "orders_api" },
    });

    const container = concepts.find((c) => c.id === "web-storefront");
    expect(container).toMatchObject({
      id: "web-storefront",
      level: "container",
      parentId: ROOT_CONTEXT_ID,
    });
  });

  it("finds an exported component and resolves a fetch() call against a known API base URL", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: { "https://api.example.com/orders": "orders_api" },
    });

    const component = concepts.find((c) => c.id === "web-storefront/CheckoutScreen")!;
    expect(component).toBeDefined();
    expect(component.level).toBe("component");
    expect(component.relations).toEqual([
      {
        targetId: "orders_api",
        kind: "sync",
        evidence: 'fetch("https://api.example.com/orders/123") matches configured API base URL "https://api.example.com/orders"',
      },
    ]);
    expect(component.needsReview).toEqual([
      'fetch("https://unrelated-service.example.com/ping") does not match any known API base URL',
    ]);
  });
});

describe("scanFrontendRepo — page detection", () => {
  it("scans a default-exported page under src/pages/ as a Next.js Page concept", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const homePage = concepts.find((c) => c.id === "web-storefront/index-page");
    expect(homePage).toMatchObject({ type: "Next.js Page", level: "component" });
  });

  it("does not derive a concept id ending in \"/index\" for a page literally named index.tsx, since okf-import.ts reserves that suffix for a directory's own child-listing navigation file (writeChildIndexes writes the container's own children to <containerId>/index.md, which would silently collide with — and be overwritten by — a same-named concept file)", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    expect(concepts.some((c) => c.id === "web-storefront/index")).toBe(false);
    expect(concepts.some((c) => c.id === "web-storefront/index-page")).toBe(true);
  });

  it("does not scan a reserved page file (_app.tsx) as a concept at all", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    expect(concepts.find((c) => c.id === "web-storefront/_app")).toBeUndefined();
  });

  it("still scans an ordinary component (not under pages/) as a React Component", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout");
    expect(layout).toMatchObject({ type: "React Component", level: "component" });
  });
});

describe("scanFrontendRepo — composition relations", () => {
  it("creates a relation for a relative import of another scanned component", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.relations).toContainEqual(
      expect.objectContaining({ targetId: "web-storefront/header", kind: "sync" }),
    );
  });

  it("creates a relation for a tsconfig path-aliased import of another scanned component", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const homePage = concepts.find((c) => c.id === "web-storefront/index-page")!;
    expect(homePage.relations).toContainEqual(
      expect.objectContaining({ targetId: "web-storefront/layout", kind: "sync" }),
    );
  });

  it("does not create a relation for a type-only import, even of a real scanned component", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.relations?.some((r) => r.targetId === "web-storefront/footer")).toBe(false);
  });

  it("merges two separate import statements resolving to the same concept into a single relation", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    const headerRelations = layout.relations?.filter((r) => r.targetId === "web-storefront/header") ?? [];
    expect(headerRelations).toHaveLength(1);
    expect(headerRelations[0].evidence).toContain("Header");
    expect(headerRelations[0].evidence).toContain("HeaderProps");
  });

  it("does not create a relation or a needsReview note for an import that resolves but isn't a scanned concept", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.relations?.some((r) => r.evidence.includes("helpers"))).toBe(false);
    expect(layout.needsReview?.some((n) => n.includes("helpers"))).toBeFalsy();
  });

  it("does not create a relation or a needsReview note for an import that can't be resolved at all (external package)", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.relations?.some((r) => r.evidence.includes("SomeWidget"))).toBe(false);
    expect(layout.needsReview?.some((n) => n.includes("some-external-ui-lib"))).toBeFalsy();
  });
});

describe("scanFrontendRepo — navigation relations", () => {
  it("creates a relation for a <Link href> matching a static page route", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.relations).toContainEqual(
      expect.objectContaining({ targetId: "web-storefront/about", kind: "sync" }),
    );
  });

  it("creates a relation for a router.push(...) literal matching a dynamic page route", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.relations).toContainEqual(
      expect.objectContaining({ targetId: "web-storefront/[slug]", kind: "sync" }),
    );
  });

  it("adds a needsReview note for a <Link href> that matches no known page route", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.needsReview).toContainEqual(
      expect.stringContaining("/deeply/nested/missing"),
    );
  });

  it("adds a needsReview note for a router.push(...) with an interpolated (non-literal) target", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: NEXTJS_FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: {},
    });

    const layout = concepts.find((c) => c.id === "web-storefront/layout")!;
    expect(layout.needsReview).toContainEqual(
      expect.stringContaining("non-literal"),
    );
  });
});
