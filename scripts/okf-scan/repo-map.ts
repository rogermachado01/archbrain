import { readFile, writeFile } from "node:fs/promises";
import { parse, stringify } from "yaml";
import { z } from "zod";
import type { RepoMapConfig } from "./types";

const BranchMapSchema = z.object({
  dev: z.string().min(1),
  hml: z.string().min(1),
  prd: z.string().min(1),
});

export const RepoMapSchema = z
  .object({
    terraform: z
      .object({
        path: z.string().min(1),
        envFiles: BranchMapSchema,
      })
      .optional(),
    resources: z
      .record(
        z.string(),
        z.object({
          repo: z.string().min(1),
          branch: BranchMapSchema,
        })
      )
      .optional(),
    frontend: z
      .array(
        z.object({
          repo: z.string().min(1),
          branch: BranchMapSchema,
        })
      )
      .optional(),
  })
  .refine((data) => data.terraform !== undefined || data.resources !== undefined || data.frontend !== undefined, {
    message: "repo-map.yaml must define at least one of: terraform, resources, frontend",
  });

/**
 * Validates an already-decoded value against the repo-map schema, throwing a
 * message that names `sourceLabel` (the file path, for both `loadRepoMap`'s
 * read and `saveRepoMap`'s pre-write check) so a caller sees exactly which
 * file/save attempt was invalid.
 */
export function validateRepoMapConfig(parsed: unknown, sourceLabel: string): RepoMapConfig {
  const result = RepoMapSchema.safeParse(parsed);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
    throw new Error(`Invalid repo-map.yaml at ${sourceLabel}:\n- ${messages.join("\n- ")}`);
  }
  return result.data;
}

export async function loadRepoMap(filePath: string): Promise<RepoMapConfig> {
  const raw = await readFile(filePath, "utf-8");
  const parsed = parse(raw);
  return validateRepoMapConfig(parsed, filePath);
}

/** Validates `config` before writing, so a malformed edit from the pipeline UI never overwrites a previously-valid repo-map.yaml on disk. */
export async function saveRepoMap(filePath: string, config: RepoMapConfig): Promise<void> {
  const validated = validateRepoMapConfig(config, filePath);
  await writeFile(filePath, stringify(validated), "utf-8");
}
