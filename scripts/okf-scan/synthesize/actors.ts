import Anthropic from "@anthropic-ai/sdk";
import type { ConceptFacts } from "../types";
// RelationKind is defined in the app's own type module, not re-exported from
// "../types" (that module only imports it for its own internal use, same as
// DddSubdomain — see organize.ts) — import it directly from its source.
import type { RelationKind } from "../../../src/lib/types";

const MODEL = "claude-sonnet-5";
const MAX_ATTEMPTS = 3;
const MAX_TOKENS = 4096;
const MARKER = "ACTORS:";
const VALID_KINDS = new Set<RelationKind>(["sync", "async-event", "compensation"]);

export interface ActorProposal {
  type: "Person" | "External System";
  title: string;
  description: string;
  relationLabel: string;
  relationKind?: RelationKind;
}

export interface ActorInferenceClient {
  inferActors(concepts: ConceptFacts[]): Promise<ActorProposal[]>;
}

function buildPrompt(concepts: ConceptFacts[]): string {
  const lines = [
    "You are looking at every concept scanned from one software system, deciding whether its architecture diagram is missing any root-level actors: a human Person who uses the system, and/or an External System the code merely calls out to (an API client, an auth provider, a CMS) but that isn't itself part of what was scanned.",
    "Ground every proposal ONLY in evidence already present below — do not invent a persona or backend that isn't clearly implied by a concept's type, description, or relations. If the evidence is too thin to be confident, propose zero actors; do not force a guess.",
    `Concepts (${concepts.length}):`,
    ...concepts.map((c) => {
      const relSummary = c.relations?.length
        ? ` — relates to: ${c.relations.map((r) => r.targetId).join(", ")}`
        : "";
      return `- ${c.id} (${c.type})${relSummary}`;
    }),
    "",
    `For each actor you propose, output a block under a "${MARKER}" heading in exactly this format, one block per actor, separated by a blank line:`,
    "type=<Person|External System>",
    'title=<short display name, e.g. "Visitor" or "Contentful CMS">',
    "description=<one sentence, grounded only in the evidence above>",
    'relation_label=<short phrase for this actor\'s relationship to the system, e.g. "Browses the site" or "Fetches content via GraphQL">',
    "relation_kind=<sync|async-event|compensation, or leave blank for sync>",
    "If you find no confident evidence for any actor, output the heading with nothing after it. Propose at most 3 actors total. Output nothing else.",
  ];
  return lines.join("\n");
}

function parseActors(text: string): ActorProposal[] {
  const markerIndex = text.indexOf(MARKER);
  if (markerIndex === -1) return [];
  const body = text.slice(markerIndex + MARKER.length);
  const blocks = body
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const proposals: ActorProposal[] = [];
  for (const block of blocks) {
    const fields: Record<string, string> = {};
    for (const line of block.split("\n")) {
      const m = line.match(/^([a-z_]+)=(.*)$/);
      if (m) fields[m[1]] = m[2].trim();
    }
    const type = fields.type === "Person" || fields.type === "External System" ? fields.type : undefined;
    if (!type || !fields.title || !fields.description || !fields.relation_label) continue;
    const kind = fields.relation_kind as RelationKind | undefined;
    proposals.push({
      type,
      title: fields.title,
      description: fields.description,
      relationLabel: fields.relation_label,
      relationKind: kind && VALID_KINDS.has(kind) ? kind : undefined,
    });
  }
  return proposals.slice(0, 3);
}

export function createAnthropicActorInferenceClient(
  apiKey: string | undefined = process.env.ANTHROPIC_API_KEY,
): ActorInferenceClient {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required to infer root-level actors");
  const client = new Anthropic({ apiKey });

  return {
    async inferActors(concepts) {
      if (concepts.length === 0) return [];

      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const response = await client.messages.create({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            thinking: { type: "disabled" },
            messages: [{ role: "user", content: buildPrompt(concepts) }],
          });
          if (response.stop_reason === "max_tokens") {
            throw new Error("Actor inference response was truncated by max_tokens");
          }
          const textBlock = response.content.find((block) => block.type === "text");
          if (!textBlock || textBlock.type !== "text") throw new Error("Actor inference response had no text content");
          return parseActors(textBlock.text);
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
