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

    const homePage = concepts.find((c) => c.id === "web-storefront/index");
    expect(homePage).toMatchObject({ type: "Next.js Page", level: "component" });
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
