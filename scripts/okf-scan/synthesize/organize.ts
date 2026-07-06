import Anthropic from "@anthropic-ai/sdk";
import type { ConceptFacts } from "../types";
// DddSubdomain is defined in the app's own type module, not re-exported from
// "../types" (that module only imports AwsGroupKind/C4Level/RelationKind from
// here for its own internal use) — import it directly from its source instead
// of guessing at a re-export that doesn't exist.
import type { DddSubdomain } from "../../../src/lib/types";

const MODEL = "claude-sonnet-5";
const MAX_ATTEMPTS = 3;
const MARKER = "CONTEXT ASSIGNMENTS:";
const VALID_SUBDOMAINS = new Set<DddSubdomain>(["core", "supporting", "generic"]);

export interface ContextAssignment {
  context?: string;
  subdomain?: DddSubdomain;
  role?: string;
}

export interface OrganizerChild {
  facts: ConceptFacts;
  /**
   * A hand-curated ddd_context already set on this concept's existing file, if any —
   * passed to the model as a fixed anchor name to reuse for other children in the
   * same conceptual group, rather than inventing a second name for it.
   */
  existingContext?: string;
}

export interface OrganizerClient {
  organizeChildren(containerId: string, children: OrganizerChild[]): Promise<Record<string, ContextAssignment>>;
}

function buildPrompt(containerId: string, children: OrganizerChild[]): string {
  const lines = [
    "You are grouping the components of one software container into a small number of named, coherent conceptual groups (bounded contexts) for an architecture diagram — the goal is to make a large flat list of components easy for a human to scan by clustering related ones together.",
    `Container: ${containerId}`,
    `Components (${children.length}):`,
    ...children.map((c) => {
      const relSummary = c.facts.relations?.length
        ? ` — relates to: ${c.facts.relations.map((r) => r.targetId).join(", ")}`
        : "";
      const anchor = c.existingContext
        ? ` [already assigned to group "${c.existingContext}" — reuse this exact name if another component belongs in the same group]`
        : "";
      return `- ${c.facts.id} (${c.facts.type})${relSummary}${anchor}`;
    }),
    "",
    `For each component listed above, output one line under a "${MARKER}" heading in exactly this format:`,
    `<component id>: context=<short group name, 1-4 words, Title Case> | subdomain=<core|supporting|generic> | role=<short tactical role, e.g. "Presentational Component" or "Data Fetching Hook">`,
    'Reuse the exact same context name across every component that conceptually belongs together, including any component whose existing group name was given above. Use "core" for subdomains central to this app\'s own differentiating logic, "supporting" for necessary-but-not-differentiating pieces, and "generic" for purely technical/utility concerns. Output one line per component listed above, in the same order, and nothing else.',
  ];
  return lines.join("\n");
}

function parseAssignments(text: string, childIds: Set<string>): Record<string, ContextAssignment> {
  const markerIndex = text.indexOf(MARKER);
  if (markerIndex === -1) return {};
  const body = text.slice(markerIndex + MARKER.length);
  const result: Record<string, ContextAssignment> = {};
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([^\s:][^:]*):\s*(.+)$/);
    if (!match) continue;
    const [, id, rest] = match;
    if (!childIds.has(id)) continue;

    const assignment: ContextAssignment = {};
    const contextMatch = rest.match(/context=([^|]+)/);
    if (contextMatch) assignment.context = contextMatch[1].trim();
    const subdomainMatch = rest.match(/subdomain=([^|]+)/);
    const subdomain = subdomainMatch?.[1]?.trim() as DddSubdomain | undefined;
    if (subdomain && VALID_SUBDOMAINS.has(subdomain)) assignment.subdomain = subdomain;
    const roleMatch = rest.match(/role=(.+)$/);
    if (roleMatch) assignment.role = roleMatch[1].trim();

    if (Object.keys(assignment).length > 0) result[id] = assignment;
  }
  return result;
}

export function createAnthropicOrganizerClient(
  apiKey: string | undefined = process.env.ANTHROPIC_API_KEY
): OrganizerClient {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required to organize concepts into bounded contexts");
  const client = new Anthropic({ apiKey });

  return {
    async organizeChildren(containerId, children) {
      if (children.length === 0) return {};
      const childIds = new Set(children.map((c) => c.facts.id));

      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const response = await client.messages.create({
            model: MODEL,
            max_tokens: 2048,
            thinking: { type: "disabled" },
            messages: [{ role: "user", content: buildPrompt(containerId, children) }],
          });
          if (response.stop_reason === "max_tokens") {
            throw new Error("Organizer response was truncated by max_tokens");
          }
          const textBlock = response.content.find((block) => block.type === "text");
          if (!textBlock || textBlock.type !== "text") throw new Error("Organizer response had no text content");
          return parseAssignments(textBlock.text, childIds);
        } catch (err) {
          lastError = err;
          const isRateLimit = err instanceof Anthropic.APIError && err.status === 429;
          if (!isRateLimit || attempt === MAX_ATTEMPTS - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500));
        }
      }
      throw lastError;
    },
  };
}
