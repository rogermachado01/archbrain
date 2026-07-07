import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { z } from "zod";
import type { RepoMapConfig } from "./types";

const BranchMapSchema = z.object({
  dev: z.string().min(1),
  hml: z.string().min(1),
  prd: z.string().min(1),
});

const RepoMapSchema = z
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

export async function loadRepoMap(filePath: string): Promise<RepoMapConfig> {
  const raw = await readFile(filePath, "utf-8");
  const parsed = parse(raw);
  const result = RepoMapSchema.safeParse(parsed);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
    throw new Error(`Invalid repo-map.yaml at ${filePath}:\n- ${messages.join("\n- ")}`);
  }
  return result.data;
}
