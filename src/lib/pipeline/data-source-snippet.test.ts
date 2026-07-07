import { describe, expect, it } from "vitest";
import { dataSourceSnippet } from "./data-source-snippet";

describe("dataSourceSnippet", () => {
  it("derives the id from the last path segment", () => {
    const snippet = dataSourceSnippet("public/okf-bundles/blog2");
    expect(snippet).toContain('id: "blog2"');
    expect(snippet).toContain('label: "blog2"');
    expect(snippet).toContain('okfBasePath: "/okf-bundles/blog2"');
  });

  it("ignores a trailing slash", () => {
    expect(dataSourceSnippet("public/okf-bundles/blog2/")).toContain('id: "blog2"');
  });

  it("handles a Windows-style backslash path", () => {
    expect(dataSourceSnippet("public\\okf-bundles\\blog2")).toContain('id: "blog2"');
  });
});
