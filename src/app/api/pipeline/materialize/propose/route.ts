import { NextResponse } from "next/server";
import { errorResponse, parseScanRequest } from "@/lib/pipeline/api-helpers";
import { loadManifest } from "@okf-scan/manifest";
import { scanRepos } from "@okf-scan/scan-repos";
import { createAnthropicActorInferenceClient } from "@okf-scan/synthesize/actors";
import { proposeMaterialization, writeProposal } from "@okf-scan/synthesize/materialize";
import { createAnthropicOrganizerClient } from "@okf-scan/synthesize/organize";
import { emptyManifest } from "@okf-scan/types";

export async function POST(request: Request) {
  try {
    const fields = parseScanRequest(await request.json());
    const { scanResult } = await scanRepos(
      fields.repoMap,
      fields.env,
      fields.out,
      fields.force,
      fields.concurrencyGit,
      fields.concurrencyScan,
    );
    const manifestForSkip = fields.force ? emptyManifest() : await loadManifest(fields.out);
    const alreadyMaterialized = new Set(Object.keys(manifestForSkip.materializedContainers ?? {}));
    const proposal = await proposeMaterialization(
      scanResult,
      createAnthropicOrganizerClient(),
      createAnthropicActorInferenceClient(),
      alreadyMaterialized,
    );
    try {
      await writeProposal(fields.out, proposal);
    } catch (err) {
      // proposeMaterialization already did the expensive LLM work by this
      // point — a failure only writing .materialize-proposal.json to disk
      // shouldn't force the user to pay for a full re-run just to see the
      // proposal again. The apply route receives the (possibly edited)
      // proposal back from the client directly, not by re-reading this file,
      // so returning it here still lets the wizard continue.
      return NextResponse.json({
        proposal,
        warning: `materialization proposed but failed to write .materialize-proposal.json: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    return NextResponse.json({ proposal });
  } catch (err) {
    return errorResponse(err);
  }
}
