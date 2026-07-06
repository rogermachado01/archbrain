import Anthropic from "@anthropic-ai/sdk";
import type { ConceptFacts } from "../types";

const MODEL = "claude-sonnet-5";
const MAX_ATTEMPTS = 3;

function buildPrompt(facts: ConceptFacts): string {
  const requiredLines = [
    "You are writing one OKF concept document body for an architecture diagram tool.",
    `Concept id: ${facts.id}`,
    `Type: ${facts.type}`,
  ];

  const optionalLines = [
    facts.awsResourceType ? `AWS resource type: ${facts.awsResourceType}` : "",
    facts.schema ? `Schema:\n${JSON.stringify(facts.schema, null, 2)}` : "",
    facts.relations?.length
      ? `Known relations (already extracted — do not invent any others):\n${facts.relations
          .map((r) => `- ${r.targetId}: ${r.evidence}`)
          .join("\n")}`
      : "",
  ].filter(Boolean);

  const relationCount = facts.relations?.length ?? 0;
  const instructionLines = [
    "Write 1-3 short paragraphs of plain prose describing what this concept is and how it's used, grounded only in the facts above. Do not invent fields, relations, or capabilities not listed. Do not include a heading or any markdown section markers — just the prose paragraphs.",
  ];
  if (relationCount > 0) {
    instructionLines.push(
      "",
      `After the prose, add a line containing only "RELATION LABELS:", then a numbered list with exactly ${relationCount} entries — one per relation listed above, in the same order — each a short, user-flow-oriented phrase describing that relation (e.g. "Renders the site footer" rather than restating the evidence verbatim). Do not add any other text after the list.`,
    );
  }

  // requiredLines/optionalLines are joined first, then the blank separator and final
  // instruction are appended — this keeps the blank line intact regardless of which
  // optional fact lines are present (see Issue 1 in the code review).
  return [...requiredLines, ...optionalLines, "", ...instructionLines].join("\n");
}

export interface ConceptDescription {
  prose: string;
  /**
   * Parallel to facts.relations; relationLabels[i] describes facts.relations[i].
   * Empty when there was nothing to enrich, or when the response couldn't be parsed
   * as expected — callers should fall back to each relation's raw evidence in that
   * case (a soft degrade, not a hard failure; see the design doc's "LLM label
   * enrichment" section).
   */
  relationLabels: string[];
}

const RELATION_LABELS_MARKER = "RELATION LABELS:";

function parseDescription(text: string, relationCount: number): ConceptDescription {
  const markerIndex = text.indexOf(RELATION_LABELS_MARKER);
  if (relationCount === 0 || markerIndex === -1) {
    return { prose: (markerIndex === -1 ? text : text.slice(0, markerIndex)).trim(), relationLabels: [] };
  }

  const prose = text.slice(0, markerIndex).trim();
  const labelsText = text.slice(markerIndex + RELATION_LABELS_MARKER.length);
  const labels = labelsText
    .split("\n")
    .map((line) => line.match(/^\s*\d+[.)]\s*(.+)$/)?.[1]?.trim())
    .filter((label): label is string => Boolean(label));

  return { prose, relationLabels: labels.length === relationCount ? labels : [] };
}

export interface LlmClient {
  describeConcept(facts: ConceptFacts): Promise<ConceptDescription>;
}

export function createAnthropicLlmClient(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY): LlmClient {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required to generate concept prose");
  const client = new Anthropic({ apiKey });

  return {
    async describeConcept(facts: ConceptFacts): Promise<ConceptDescription> {
      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const response = await client.messages.create({
            model: MODEL,
            max_tokens: 1024,
            // This task (short descriptive prose from already-extracted facts) needs no
            // multi-step reasoning. On Claude Sonnet 5, omitting `thinking` runs adaptive
            // thinking by default, and thinking tokens share the same max_tokens budget as
            // the visible response — so a thinking-heavy turn could silently truncate or
            // empty out the prose we actually want. Disable it explicitly.
            thinking: { type: "disabled" },
            messages: [{ role: "user", content: buildPrompt(facts) }],
          });
          if (response.stop_reason === "max_tokens") {
            throw new Error("LLM response was truncated by max_tokens");
          }
          const textBlock = response.content.find((block) => block.type === "text");
          if (!textBlock || textBlock.type !== "text") throw new Error("LLM response had no text content");
          return parseDescription(textBlock.text.trim(), facts.relations?.length ?? 0);
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
