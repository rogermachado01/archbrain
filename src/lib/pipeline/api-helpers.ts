import { NextResponse } from "next/server";
import type { Environment, RepoMapConfig } from "@okf-scan/types";

export interface ScanRequestFields {
  repoMap: RepoMapConfig;
  env: Environment;
  out: string;
  force: boolean;
  concurrencyGit: number;
  concurrencyScan: number;
  concurrencyLlm: number;
}

/**
 * Parses and validates the fields every pipeline scan/materialize route
 * shares, throwing a plain Error with a message safe to show directly in the
 * wizard UI on anything missing or malformed.
 */
export function parseScanRequest(body: unknown): ScanRequestFields {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!b.repoMap || typeof b.repoMap !== "object") throw new Error("Missing required field: repoMap");
  if (b.env !== "dev" && b.env !== "hml" && b.env !== "prd") {
    throw new Error(`env must be one of dev, hml, prd (got "${String(b.env)}")`);
  }
  if (typeof b.out !== "string" || b.out.length === 0) throw new Error("Missing required field: out");
  return {
    repoMap: b.repoMap as RepoMapConfig,
    env: b.env,
    out: b.out,
    force: Boolean(b.force),
    concurrencyGit: typeof b.concurrencyGit === "number" ? b.concurrencyGit : 20,
    concurrencyScan: typeof b.concurrencyScan === "number" ? b.concurrencyScan : 4,
    concurrencyLlm: typeof b.concurrencyLlm === "number" ? b.concurrencyLlm : 6,
  };
}

/** Every pipeline route handler catches its own errors and returns this shape, so the wizard can render the message inline instead of a generic failure. */
export function errorResponse(err: unknown, status = 500) {
  return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status });
}
