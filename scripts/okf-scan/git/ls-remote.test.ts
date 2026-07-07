import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import simpleGit from "simple-git";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRemoteBranchSha } from "./ls-remote";

describe("getRemoteBranchSha", () => {
  let repoDir: string;

  beforeEach(async () => {
    repoDir = await mkdtemp(path.join(tmpdir(), "okf-scan-lsremote-"));
    const git = simpleGit(repoDir);
    await git.init();
    await git.addConfig("user.email", "test@example.com");
    await git.addConfig("user.name", "Test");
    await writeFile(path.join(repoDir, "app.txt"), "main content\n");
    await git.add("./*");
    await git.commit("initial commit on main");
    await git.checkoutLocalBranch("develop");
    await writeFile(path.join(repoDir, "app.txt"), "develop content\n");
    await git.add("./*");
    await git.commit("commit on develop");
  });

  afterEach(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  it("returns the current commit SHA of the given branch without a clone", async () => {
    const git = simpleGit(repoDir);
    const expectedSha = (await git.revparse(["develop"])).trim();

    const sha = await getRemoteBranchSha(repoDir, "develop");

    expect(sha).toBe(expectedSha);
  });

  it("throws a descriptive error for a branch that doesn't exist", async () => {
    await expect(getRemoteBranchSha(repoDir, "does-not-exist")).rejects.toThrow(/does-not-exist/);
  });

  it("works when repoPath is relative to the current working directory", async () => {
    const git = simpleGit(repoDir);
    const expectedSha = (await git.revparse(["develop"])).trim();
    const relativeRepoPath = path.relative(process.cwd(), repoDir);

    const sha = await getRemoteBranchSha(relativeRepoPath, "develop");

    expect(sha).toBe(expectedSha);
  });
});
