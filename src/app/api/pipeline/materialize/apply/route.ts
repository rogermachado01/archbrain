import { NextResponse } from "next/server";
import { errorResponse, parseScanRequest } from "@/lib/pipeline/api-helpers";
import { recordScanManifest, scanRepos } from "@okf-scan/scan-repos";
import { applyMaterializationProposal, writeProposal, type MaterializationProposal } from "@okf-scan/synthesize/materialize";
import { createAnthropicLlmClient } from "@okf-scan/synthesize/llm";
import { createAnthropicOrganizerClient } from "@okf-scan/synthesize/organize";
import { synthesize } from "@okf-scan/synthesize/synthesize";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fields = parseScanRequest(body);
    const proposal = body.proposal as MaterializationProposal | undefined;
    if (!proposal) throw new Error("Missing required field: proposal");

    // Write first, so the on-disk plan matches what's actually applied below —
    // same as a human hand-editing .materialize-proposal.json before running
    // `--materialize apply` today.
    await writeProposal(fields.out, proposal);

    const { scanResult, freshness } = await scanRepos(
      fields.repoMap,
      fields.env,
      fields.out,
      fields.force,
      fields.concurrencyGit,
      fields.concurrencyScan,
    );
    const applied = applyMaterializationProposal(scanResult, proposal);
    const newlyMaterializedContainerIds = proposal.containerPlans.map((p) => p.containerId);

    const summary = await synthesize({
      scanResult: applied,
      bundleDir: fields.out,
      llm: createAnthropicLlmClient(),
      organizer: createAnthropicOrganizerClient(),
      force: fields.force,
      concurrency: fields.concurrencyLlm,
      newlyMaterializedContainerIds,
    });
    try {
      await recordScanManifest(fields.out, freshness, fields.env, scanResult.lambdaEnvVarBindings);
    } catch (err) {
      // synthesize() already durably wrote every concept file and its own
      // manifest entries (including materializedContainers) by this point —
      // a failure here only means the freshness/lambdaEnvVarBindings
      // bookkeeping didn't get recorded, not that the apply failed. Return
      // the real summary with a warning instead of masking a mostly-
      // successful run as a hard failure (same pattern as the plain scan
      // route's equivalent step).
      return NextResponse.json({
        summary,
        warning: `materialization applied but recording manifest failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    return NextResponse.json({ summary });
  } catch (err) {
    return errorResponse(err);
  }
}
