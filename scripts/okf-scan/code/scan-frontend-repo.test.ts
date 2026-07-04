import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanFrontendRepo } from "./scan-frontend-repo";

const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "frontend-repo");

describe("scanFrontendRepo", () => {
  it("finds an exported component and resolves a fetch() call against a known API base URL", async () => {
    const concepts = await scanFrontendRepo({
      repoDir: FIXTURE_DIR,
      containerId: "web-storefront",
      apiBaseUrls: { "https://api.example.com/orders": "orders_api" },
    });

    expect(concepts).toHaveLength(1);
    const [component] = concepts;
    expect(component.id).toBe("web-storefront/CheckoutScreen");
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
