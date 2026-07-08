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
    await recordScanManifest(fields.out, freshness, fields.env, scanResult.lambdaEnvVarBindings);
    return NextResponse.json({ summary });
  } catch (err) {
    return errorResponse(err);
  }
}
