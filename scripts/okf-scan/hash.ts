import { createHash } from "node:crypto";

export function hashContent(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashJson(value: unknown): string {
  return hashContent(JSON.stringify(value));
}
