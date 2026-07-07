import { describe, expect, it } from "vitest";
import { findFrontendIcon } from "./frontend-icons";

describe("findFrontendIcon", () => {
  it("resolves every known scanner-produced type to its icon file", () => {
    expect(findFrontendIcon("Next.js Page")).toBe("fe-screen.svg");
    expect(findFrontendIcon("React Route")).toBe("fe-screen.svg");
    expect(findFrontendIcon("Redux Slice")).toBe("fe-store.svg");
    expect(findFrontendIcon("Store")).toBe("fe-store.svg");
    expect(findFrontendIcon("API Client")).toBe("fe-service.svg");
    expect(findFrontendIcon("Service")).toBe("fe-service.svg");
    expect(findFrontendIcon("Design System Package")).toBe("fe-design-system.svg");
    expect(findFrontendIcon("UI Capability")).toBe("fe-design-system.svg");
    expect(findFrontendIcon("Custom Hook")).toBe("fe-hook.svg");
    expect(findFrontendIcon("React Hook")).toBe("fe-hook.svg");
    expect(findFrontendIcon("React Component")).toBe("fe-component.svg");
    expect(findFrontendIcon("Person")).toBe("user.svg");
    expect(findFrontendIcon("External System")).toBe("generic-application.svg");
  });

  it("returns undefined for an unrecognized type, so buildConceptMarkdown falls back to no icon rather than a wrong one", () => {
    expect(findFrontendIcon("Amazon DynamoDB Table")).toBeUndefined();
    expect(findFrontendIcon("Nonsense Type")).toBeUndefined();
  });
});
