import { describe, expect, it } from "vitest";
import { saveWikiPage, type WikiSaveIo } from "./save";

const BASE_PATH = "/bundle";

const INDEX_MD = `---
title: Test Bundle
---
- [Page A](page-a.md) - desc
- [Page B](page-b.md) - desc
`;

const PAGE_A_MD = `---
title: Page A
level: container
---
# Relations
- [Page B](page-b.md) — calls
`;

const PAGE_B_MD = `---
title: Page B
level: container
---
`;

function makeFakeIo(files: Record<string, string>): WikiSaveIo & { written: Record<string, string> } {
  const written: Record<string, string> = {};
  return {
    written,
    readText: async (p) => {
      if (p in written) return written[p];
      if (p in files) return files[p];
      throw new Error(`fake io: no such file "${p}"`);
    },
    exists: async (p) => p in written || p in files,
    writeText: async (p, content) => {
      written[p] = content;
    },
  };
}

function baseFiles(): Record<string, string> {
  return {
    [`${BASE_PATH}/index.md`]: INDEX_MD,
    [`${BASE_PATH}/page-a.md`]: PAGE_A_MD,
    [`${BASE_PATH}/page-b.md`]: PAGE_B_MD,
  };
}

describe("saveWikiPage", () => {
  it("writes the edited content and returns ok:true for a valid edit", async () => {
    const io = makeFakeIo(baseFiles());
    const edited = PAGE_B_MD.replace("Page B", "Page B (renamed)");

    const result = await saveWikiPage(BASE_PATH, "page-b.md", edited, io);

    expect(result).toEqual({ ok: true });
    expect(io.written[`${BASE_PATH}/page-b.md`]).toBe(edited);
  });

  it("rejects an edit whose Relations section points at a node that doesn't exist, and never writes", async () => {
    const io = makeFakeIo(baseFiles());
    const edited = PAGE_A_MD.replace("[Page B](page-b.md)", "[Ghost](nope.md)");

    const result = await saveWikiPage(BASE_PATH, "page-a.md", edited, io);

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toContain("nope");
    expect(io.written).toEqual({});
  });

  it("rejects a path that would escape basePath, before touching io", async () => {
    const io = makeFakeIo(baseFiles());

    const result = await saveWikiPage(BASE_PATH, "../../etc/passwd", "evil", io);

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toContain(BASE_PATH);
    expect(io.written).toEqual({});
  });

  it("validates the edited page's relations against the real content of every other page", async () => {
    const io = makeFakeIo(baseFiles());
    const edited = PAGE_A_MD.replace("Page A", "Page A (renamed)");

    const result = await saveWikiPage(BASE_PATH, "page-a.md", edited, io);

    expect(result).toEqual({ ok: true });
    expect(io.written[`${BASE_PATH}/page-a.md`]).toBe(edited);
    expect(io.written[`${BASE_PATH}/page-b.md`]).toBeUndefined();
  });
});
