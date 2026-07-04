import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadManifest, saveManifest } from "./manifest";
import type { ScanManifest } from "./types";

describe("manifest", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "okf-scan-manifest-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns an empty manifest when none exists yet", async () => {
    const manifest = await loadManifest(dir);
    expect(manifest).toEqual({ _repos: {}, concepts: {} });
  });

  it("round-trips a saved manifest", async () => {
    const manifest: ScanManifest = {
      _repos: { "orders-service": { lastScannedRef: "abc123", env: "dev" } },
      concepts: {
        "orders-service/handler": {
          inputHash: "deadbeef",
          facts: {
            id: "orders-service/handler",
            type: "AWS Lambda Function",
            level: "component",
            parentId: "orders-service",
            sourceFiles: ["/repo/handler.ts"],
          },
          lastScannedAt: "2026-07-04T00:00:00.000Z",
        },
      },
    };
    await saveManifest(dir, manifest);
    const loaded = await loadManifest(dir);
    expect(loaded).toEqual(manifest);
  });
});
