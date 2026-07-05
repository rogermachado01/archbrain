import { describe, expect, it } from "vitest";
import {
  buildRouteTable,
  isReservedPageFile,
  matchRoute,
  pagesRelativePath,
  routeSegmentsForPageFile,
} from "./next-routes";

describe("pagesRelativePath", () => {
  it("returns the path relative to src/pages/", () => {
    expect(pagesRelativePath("/repo/src/pages/about.tsx", "/repo")).toBe("about.tsx");
  });

  it("returns the path relative to a bare pages/ (no src/) directory", () => {
    expect(pagesRelativePath("/repo/pages/about.tsx", "/repo")).toBe("about.tsx");
  });

  it("returns undefined for a file outside any pages/ directory", () => {
    expect(pagesRelativePath("/repo/src/components/header.tsx", "/repo")).toBeUndefined();
  });
});

describe("isReservedPageFile", () => {
  it("flags Next.js's reserved page files", () => {
    expect(isReservedPageFile("_app.tsx")).toBe(true);
    expect(isReservedPageFile("_document.tsx")).toBe(true);
    expect(isReservedPageFile("404.tsx")).toBe(true);
  });

  it("does not flag an ordinary page file", () => {
    expect(isReservedPageFile("about.tsx")).toBe(false);
  });
});

describe("routeSegmentsForPageFile", () => {
  it("maps index.tsx to the root (no segments)", () => {
    expect(routeSegmentsForPageFile("index.tsx")).toEqual([]);
  });

  it("maps a literal file to a single literal segment", () => {
    expect(routeSegmentsForPageFile("about.tsx")).toEqual([{ type: "literal", value: "about" }]);
  });

  it("maps a dynamic [slug].tsx to a dynamic segment", () => {
    expect(routeSegmentsForPageFile("[slug].tsx")).toEqual([{ type: "dynamic" }]);
  });

  it("maps a nested catch-all under a literal prefix", () => {
    expect(routeSegmentsForPageFile("blog/[...slug].tsx")).toEqual([
      { type: "literal", value: "blog" },
      { type: "catch-all" },
    ]);
  });

  it("maps a nested optional catch-all under a literal prefix", () => {
    expect(routeSegmentsForPageFile("blog/[[...slug]].tsx")).toEqual([
      { type: "literal", value: "blog" },
      { type: "optional-catch-all" },
    ]);
  });
});

describe("matchRoute", () => {
  const routeTable = buildRouteTable([
    { conceptId: "web-storefront/index", pagesRelative: "index.tsx" },
    { conceptId: "web-storefront/about", pagesRelative: "about.tsx" },
    { conceptId: "web-storefront/[slug]", pagesRelative: "[slug].tsx" },
  ]);

  it("matches the root route", () => {
    expect(matchRoute("/", routeTable)).toBe("web-storefront/index");
  });

  it("matches a literal route", () => {
    expect(matchRoute("/about", routeTable)).toBe("web-storefront/about");
  });

  it("matches a dynamic route with any single segment", () => {
    expect(matchRoute("/some-post", routeTable)).toBe("web-storefront/[slug]");
  });

  it("strips a query string before matching", () => {
    expect(matchRoute("/about?ref=footer", routeTable)).toBe("web-storefront/about");
  });

  it("returns undefined when no route matches (too many segments for any pattern)", () => {
    expect(matchRoute("/deeply/nested/missing", routeTable)).toBeUndefined();
  });
});
