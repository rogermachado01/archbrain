import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { mapWithConcurrency } from "../concurrency";
import { hashJson } from "../hash";
import { loadManifest, saveManifest } from "../manifest";
import { emptyManifest, ROOT_CONTEXT_ID, type ConceptFacts, type GroupFact, type ScanManifest, type ScanResult } from "../types";
import { buildConceptMarkdown, readPreserved, titleize, type ExistingConceptFile } from "./markdown";
import type { LlmClient } from "./llm";
import type { ContextAssignment, OrganizerClient } from "./organize";

export interface SynthesizeOptions {
  scanResult: ScanResult;
  bundleDir: string;
  llm: LlmClient;
  /** Assigns ddd_context/subdomain/role per container. Defaults to a no-op (no auto-assignment) when omitted, so existing callers/tests are unaffected. */
  organizer?: OrganizerClient;
  force?: boolean;
  /** max concurrent LLM prose calls; the rate-limit-bound stage, so this stays low by default */
  concurrency?: number;
  now?: () => string;
}

export interface SynthesizeSummary {
  written: string[];
  skipped: string[];
  needsReview: { id: string; notes: string[] }[];
  /** Concepts whose LLM call or markdown write failed; these are neither written nor recorded in the manifest, so they're retried on the next run. */
  failed: { id: string; error: string }[];
}

/** Directory name `writeGroupFiles` reserves for AWS network groups (`bundleDir/groups/`). */
const RESERVED_GROUPS_DIR = "groups";

async function readIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

function conceptFilePath(bundleDir: string, id: string): string {
  return path.join(bundleDir, `${id}.md`);
}

/**
 * Mirrors groupBundlePath's (markdown.ts) cycle-detection walk over
 * parentGroupId chains, but additionally treats a dangling parentGroupId
 * (pointing at an id absent from `groups`) as an error instead of silently
 * treating it as "reached the root" — both are validated up front, before any
 * LLM calls or file writes, so a bad `groups` array fails fast with a clear
 * message rather than surfacing later as a confusing throw deep inside
 * buildConceptMarkdown (via a concept's groupId) for one arbitrary concept.
 */
function validateGroups(groups: GroupFact[]): void {
  const byId = new Map(groups.map((g) => [g.id, g]));
  for (const group of groups) {
    const visited = new Set<string>();
    let current: GroupFact | undefined = group;
    while (current) {
      if (visited.has(current.id)) {
        throw new Error(
          `synthesize: cycle detected in group "${group.id}"'s parentGroupId chain (revisited "${current.id}")`
        );
      }
      visited.add(current.id);
      if (!current.parentGroupId) break;
      const parent = byId.get(current.parentGroupId);
      if (!parent) {
        throw new Error(
          `synthesize: group "${current.id}" has parentGroupId "${current.parentGroupId}", which does not match any group id`
        );
      }
      current = parent;
    }
  }
}

/**
 * `writeGroupFiles` always writes AWS network groups under
 * `bundleDir/groups/`. If a scanned concept's parentId is literally "groups",
 * `writeChildIndexes` would later write that concept's own child index.md to
 * the same path, silently destroying the AWS-groups listing writeGroupFiles
 * already wrote (see writeRootFiles -> writeGroupFiles, called before
 * writeChildIndexes). Fail fast instead of allowing that silent overwrite.
 */
function assertNoReservedGroupsCollision(concepts: ConceptFacts[]): void {
  const offender = concepts.find((c) => c.parentId === RESERVED_GROUPS_DIR);
  if (offender) {
    throw new Error(
      `synthesize: concept "${offender.id}" has parentId "${RESERVED_GROUPS_DIR}", which collides with the reserved directory ` +
        `writeGroupFiles uses for AWS network groups (bundleDir/${RESERVED_GROUPS_DIR}/) — rename this concept's container.`
    );
  }
}

/** Containers at or below this many children skip the organizer entirely — a
 *  view this small is already scannable, and grouping it adds noise. Matches
 *  the layout renderer's maxRowsPerLayer default plus headroom. */
const ORGANIZE_MIN_CHILDREN = 9;

type RegenerateResult =
  | { status: "ok"; id: string; inputHash: string; facts: ConceptFacts }
  | { status: "error"; id: string; error: string };

/**
 * Default `organizer` when `SynthesizeOptions.organizer` is omitted — returns no
 * assignments for any container, so behavior is unchanged for existing callers/tests.
 * Declared as a standalone, explicitly-typed constant (rather than inlined in the
 * destructuring default below) so `organizeChildren`'s return type is checked against
 * `OrganizerClient` instead of being inferred as `Promise<{}>` from the empty-object
 * literal, which would otherwise make every downstream consumer of its result type as
 * `unknown`.
 */
const NOOP_ORGANIZER: OrganizerClient = {
  async organizeChildren() {
    return {};
  },
};

export async function synthesize(options: SynthesizeOptions): Promise<SynthesizeSummary> {
  const {
    scanResult,
    bundleDir,
    llm,
    organizer = NOOP_ORGANIZER,
    force = false,
    concurrency = 6,
    now = () => new Date().toISOString(),
  } = options;

  // Validate up front, before any LLM calls or file writes: a bad `groups`
  // array or a reserved-name collision should fail fast with a clear message
  // rather than aborting mid-run (or silently corrupting output).
  validateGroups(scanResult.groups);
  assertNoReservedGroupsCollision(scanResult.concepts);

  const manifest: ScanManifest = force ? emptyManifest() : await loadManifest(bundleDir);
  const summary: SynthesizeSummary = { written: [], skipped: [], needsReview: [], failed: [] };

  const conceptTitles: Record<string, string> = {};
  for (const concept of scanResult.concepts) conceptTitles[concept.id] = titleize(concept.id);

  const toRegenerate: { facts: ConceptFacts; inputHash: string }[] = [];
  for (const facts of scanResult.concepts) {
    if (facts.needsReview?.length) summary.needsReview.push({ id: facts.id, notes: facts.needsReview });

    const inputHash = hashJson(facts);
    const previous = manifest.concepts[facts.id];
    if (!force && previous?.inputHash === inputHash) {
      summary.skipped.push(facts.id);
      continue;
    }
    toRegenerate.push({ facts, inputHash });
  }

  // Read every concept's currently-preserved ddd_* fields upfront (not just
  // regenerating ones) — the organizer needs a complete, container-by-container
  // sibling picture, including concepts that aren't changing this run, and any of
  // them might carry a hand-set ddd_context to anchor the organizer's naming
  // choices around.
  const preservedByConceptId = new Map<string, ExistingConceptFile>();
  for (const facts of scanResult.concepts) {
    preservedByConceptId.set(facts.id, readPreserved(await readIfExists(conceptFilePath(bundleDir, facts.id))));
  }

  const childrenByParent = new Map<string, ConceptFacts[]>();
  for (const facts of scanResult.concepts) {
    if (facts.parentId === null) continue;
    childrenByParent.set(facts.parentId, [...(childrenByParent.get(facts.parentId) ?? []), facts]);
  }

  // Only organize containers that actually have a regenerating child this run — an
  // organizer assignment is only ever consumed by a concept that's being (re)written
  // below, so calling the organizer for a container whose children are all unchanged
  // (and thus all skipped, byte-for-byte) would just be a wasted LLM call whose
  // output is never used.
  const regeneratingIds = new Set(toRegenerate.map((r) => r.facts.id));
  const containersNeedingOrganizing = Array.from(childrenByParent.entries()).filter(
    ([, children]) => children.length >= ORGANIZE_MIN_CHILDREN && children.some((c) => regeneratingIds.has(c.id)),
  );

  const organizedByConceptId = new Map<string, ContextAssignment>();
  await mapWithConcurrency(containersNeedingOrganizing, concurrency, async ([parentId, children]) => {
    try {
      const assignments = await organizer.organizeChildren(
        parentId,
        children.map((c) => ({ facts: c, existingContext: preservedByConceptId.get(c.id)?.ddd_context })),
      );
      for (const [childId, assignment] of Object.entries(assignments)) {
        organizedByConceptId.set(childId, assignment);
      }
    } catch {
      // Soft-degrade: this container's children simply get no auto-assignment this
      // run, same philosophy as the relation-label enrichment fallback — an
      // organizer hiccup for one container must never block synthesis for any
      // concept, in this container or any other.
    }
  });

  // The LLM prose call is the expensive, rate-limit-bound step, so only this
  // part runs with bounded concurrency — everything else here is local fs I/O.
  // Each concept's work is isolated in its own try/catch so one concept's LLM
  // failure doesn't reject the whole batch and discard already-completed work
  // (mapWithConcurrency has no built-in per-item error isolation).
  const regenerated = await mapWithConcurrency<{ facts: ConceptFacts; inputHash: string }, RegenerateResult>(
    toRegenerate,
    concurrency,
    async ({ facts, inputHash }) => {
      try {
        const filePath = conceptFilePath(bundleDir, facts.id);
        const preserved = preservedByConceptId.get(facts.id)!;
        const organized = organizedByConceptId.get(facts.id);
        const preservedWithOrganizer: ExistingConceptFile = {
          ...preserved,
          ddd_context: preserved.ddd_context ?? organized?.context,
          ddd_subdomain: preserved.ddd_subdomain ?? organized?.subdomain,
          ddd_role: preserved.ddd_role ?? organized?.role,
        };
        const description = await llm.describeConcept(facts);
        // factsForMarkdown is a scratch copy carrying the LLM's relation labels,
        // used only for this concept's markdown output — the manifest still stores
        // the original, label-free `facts` below (unchanged), so a future run's
        // inputHash comparison keeps comparing like-for-like against freshly-scanned
        // facts, which never carry a `label` (only scanners produce facts, and no
        // scanner ever sets `.label`, only `.evidence`).
        const factsForMarkdown: ConceptFacts = facts.relations
          ? {
              ...facts,
              relations: facts.relations.map((rel, i) => ({ ...rel, label: description.relationLabels[i] ?? rel.label })),
            }
          : facts;
        const markdown = buildConceptMarkdown({
          facts: factsForMarkdown,
          prose: description.prose,
          preserved: preservedWithOrganizer,
          conceptTitles,
          groups: scanResult.groups,
        });
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, markdown, "utf-8");
        return { status: "ok", id: facts.id, inputHash, facts };
      } catch (err) {
        return { status: "error", id: facts.id, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  for (const result of regenerated) {
    if (result.status === "error") {
      summary.failed.push({ id: result.id, error: result.error });
      continue;
    }
    manifest.concepts[result.id] = { inputHash: result.inputHash, facts: result.facts, lastScannedAt: now() };
    summary.written.push(result.id);
  }

  await writeRootFiles(bundleDir, scanResult, conceptTitles);
  await writeChildIndexes(bundleDir, scanResult, conceptTitles);
  await saveManifest(bundleDir, manifest);
  return summary;
}

/**
 * A component concept's id (e.g. "orders/handler") already puts its file at
 * the right path (bundleDir/orders/handler.md), but okf-import.ts only
 * discovers files it can reach by walking index.md links — it never lists a
 * directory directly. Without a sibling "orders/index.md" bullet-listing
 * "handler.md", the component would exist on disk but never load into the
 * model at all.
 */
async function writeChildIndexes(bundleDir: string, scanResult: ScanResult, conceptTitles: Record<string, string>): Promise<void> {
  const childrenByContainer = new Map<string, ConceptFacts[]>();
  for (const facts of scanResult.concepts) {
    // parentId (not facts.id's shape) is the authoritative link to a
    // concept's container — see writeRootFiles, which filters top-level
    // concepts by parentId === ROOT_CONTEXT_ID, not by id shape. A concept
    // whose id doesn't mirror its parentId chain (e.g. "handler" with
    // parentId "orders") must still land in its real container's index.md.
    if (facts.parentId === null || facts.parentId === ROOT_CONTEXT_ID) continue;
    const containerId = facts.parentId;
    childrenByContainer.set(containerId, [...(childrenByContainer.get(containerId) ?? []), facts]);
  }

  for (const [containerId, children] of childrenByContainer) {
    const lines = ["---", `title: ${conceptTitles[containerId] ?? titleize(containerId)}`, "---", "", "# Concepts", ""];
    for (const child of children) {
      const leafName = child.id.split("/").pop()!;
      lines.push(`- [${conceptTitles[child.id]}](${leafName}.md) - ${child.type}`);
    }
    await mkdir(path.join(bundleDir, containerId), { recursive: true });
    await writeFile(path.join(bundleDir, containerId, "index.md"), `${lines.join("\n")}\n`, "utf-8");
  }
}

async function writeRootFiles(bundleDir: string, scanResult: ScanResult, conceptTitles: Record<string, string>): Promise<void> {
  await mkdir(bundleDir, { recursive: true });

  const platformLines = ["---", "type: Software System", "title: Platform", "level: context", "---", "", "Generated by scripts/okf-scan."];
  await writeFile(path.join(bundleDir, "platform.md"), `${platformLines.join("\n")}\n`, "utf-8");

  const topLevel = scanResult.concepts.filter((c) => c.parentId === ROOT_CONTEXT_ID);
  const conceptLinks = topLevel.map((c) => `- [${conceptTitles[c.id]}](${c.id}.md) - ${c.type}`);
  const groupsLink =
    scanResult.groups.length > 0
      ? ["", "# Groups", "", "- [AWS Network Groups](groups/index.md) - region/VPC/AZ/subnet boundaries"]
      : [];

  const indexLines = [
    "---",
    'title: "Generated Architecture"',
    "---",
    "",
    "# Concepts",
    "",
    "- [Platform](platform.md) - root system node",
    ...conceptLinks,
    ...groupsLink,
  ];
  await writeFile(path.join(bundleDir, "index.md"), `${indexLines.join("\n")}\n`, "utf-8");

  if (scanResult.groups.length > 0) await writeGroupFiles(bundleDir, scanResult.groups);
}

/** Mirrors the nested directory-per-level convention okf-import.ts expects: a group's children live in `<groupId>/`, sibling to `<groupId>.md`. */
async function writeGroupFiles(bundleDir: string, groups: GroupFact[]): Promise<void> {
  const byParent = new Map<string | null, GroupFact[]>();
  for (const group of groups) {
    const key = group.parentGroupId ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), group]);
  }

  async function writeLevel(dir: string, parentKey: string | null): Promise<void> {
    const children = byParent.get(parentKey) ?? [];
    await mkdir(dir, { recursive: true });
    const indexLines = ["---", "title: AWS Network Groups", "---", "", "# Concepts", ""];
    for (const group of children) indexLines.push(`- [${group.name}](${group.id}.md) - ${group.kind}`);
    await writeFile(path.join(dir, "index.md"), `${indexLines.join("\n")}\n`, "utf-8");

    for (const group of children) {
      const lines = ["---", `title: ${group.name}`, `kind: ${group.kind}`];
      if (group.subnetType) lines.push(`subnet_type: ${group.subnetType}`);
      lines.push("---", "");
      await writeFile(path.join(dir, `${group.id}.md`), `${lines.join("\n")}\n`, "utf-8");

      if ((byParent.get(group.id) ?? []).length > 0) await writeLevel(path.join(dir, group.id), group.id);
    }
  }

  await writeLevel(path.join(bundleDir, "groups"), null);
}
