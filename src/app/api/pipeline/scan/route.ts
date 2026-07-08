import { NextResponse } from "next/server";
import { errorResponse, parseScanRequest } from "@/lib/pipeline/api-helpers";
import { recordScanManifest, scanRepos } from "@okf-scan/scan-repos";
import { createAnthropicLlmClient } from "@okf-scan/synthesize/llm";
import { createAnthropicOrganizerClient } from "@okf-scan/synthesize/organize";
import { synthesize } from "@okf-scan/synthesize/synthesize";

export async function POST(request: Request) {
  try {
    const fields = parseScanRequest(await request.json());
    const { scanResult, freshness } = await scanRepos(
      fields.repoMap,
      fields.env,
      fields.out,
      fields.force,
      fields.concurrencyGit,
      fields.concurrencyScan,
    );
    const summary = await synthesize({
      scanResult,
      bundleDir: fields.out,
      llm: createAnthropicLlmClient(),
      organizer: createAnthropicOrganizerClient(),
      force: fields.force,
      concurrency: fields.concurrencyLlm,
    });
    try {
      await recordScanManifest(fields.out, freshness, fields.env, scanResult.lambdaEnvVarBindings);
    } catch (err) {
      // synthesize() already durably wrote every concept file and its own
      // manifest entries by this point — a failure here only means the
      // freshness/lambdaEnvVarBindings bookkeeping didn't get recorded, not
      // that the scan failed. Return the real summary with a warning instead
      // of masking a mostly-successful run as a hard failure.
      return NextResponse.json({
        summary,
        warning: `scan completed but recording manifest failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    return NextResponse.json({ summary });
  } catch (err) {
    return errorResponse(err);
  }
}
