import Anthropic from "@anthropic-ai/sdk";
import type { ConceptFacts } from "../types";

const MODEL = "claude-sonnet-5";
const MAX_ATTEMPTS = 3;

function buildPrompt(facts: ConceptFacts): string {
  return [
    "You are writing one OKF concept document body for an architecture diagram tool.",
    `Concept id: ${facts.id}`,
    `Type: ${facts.type}`,
    facts.awsResourceType ? `AWS resource type: ${facts.awsResourceType}` : "",
    facts.schema ? `Schema:\n${JSON.stringify(facts.schema, null, 2)}` : "",
    facts.relations?.length
      ? `Known relations (already extracted — do not invent any others):\n${facts.relations
          .map((r) => `- ${r.targetId}: ${r.evidence}`)
          .join("\n")}`
      : "",
    "",
    "Write 1-3 short paragraphs of plain prose describing what this concept is and how it's used, grounded only in the facts above. Do not invent fields, relations, or capabilities not listed. Do not include a heading or any markdown section markers — just the prose paragraphs.",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface LlmClient {
  describeConcept(facts: ConceptFacts): Promise<string>;
}

export function createAnthropicLlmClient(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY): LlmClient {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required to generate concept prose");
  const client = new Anthropic({ apiKey });

  return {
    async describeConcept(facts: ConceptFacts): Promise<string> {
      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const response = await client.messages.create({
            model: MODEL,
            max_tokens: 400,
            messages: [{ role: "user", content: buildPrompt(facts) }],
          });
          const textBlock = response.content.find((block) => block.type === "text");
          if (!textBlock || textBlock.type !== "text") throw new Error("LLM response had no text content");
          return textBlock.text.trim();
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
