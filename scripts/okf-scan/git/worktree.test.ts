import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import simpleGit from "simple-git";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { syncWorktree, worktreePath } from "./worktree";

describe("syncWorktree", () => {
  let base: string;
  let upstreamDir: string;
  let localDir: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    base = await mkdtemp(path.join(tmpdir(), "okf-scan-worktree-"));
    upstreamDir = path.join(base, "upstream");
    localDir = path.join(base, "local");

    // simple-git's `.init(bare)` only accepts a boolean and always inits at
    // the instance's own cwd (see git-factory.ts/init.ts) — it does not take
    // a target path, so the directory must exist and the instance must
    // already be bound to it before calling `.init()`.
    await mkdir(upstreamDir, { recursive: true });
    const upstream = simpleGit(upstreamDir);
    // Force the initial branch name to "main" regardless of this machine's
    // git version/config defaults (older git defaults to "master").
    await upstream.init(["--initial-branch=main"]);
    const upstreamGit = simpleGit(upstreamDir);
    await upstreamGit.addConfig("user.email", "test@example.com");
    await upstreamGit.addConfig("user.name", "Test");
    await writeFile(path.join(upstreamDir, "app.txt"), "main content\n");
    await upstreamGit.add("./*");
    await upstreamGit.commit("initial commit on main");
    await upstreamGit.checkoutLocalBranch("develop");
    await writeFile(path.join(upstreamDir, "app.txt"), "develop content\n");
    await upstreamGit.add("./*");
    await upstreamGit.commit("commit on develop");
    await upstreamGit.checkout("main");

    await simpleGit().clone(upstreamDir, localDir);
    process.chdir(base);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(base, { recursive: true, force: true });
  });

  it("checks out the target branch into an isolated worktree without touching the local clone", async () => {
    const target = await syncWorktree(localDir, "orders-service", "develop", "dev");
    expect(target).toBe(worktreePath("orders-service", "dev"));

    // Normalize CRLF: Windows git commonly checks out with core.autocrlf
    // conversion, which is orthogonal to the worktree-isolation behavior
    // under test here.
    const worktreeContent = (await readFile(path.join(target, "app.txt"), "utf-8")).replace(/\r\n/g, "\n");
    expect(worktreeContent).toBe("develop content\n");

    const localBranch = (await simpleGit(localDir).branch()).current;
    expect(localBranch).toBe("main");
    const localContent = (await readFile(path.join(localDir, "app.txt"), "utf-8")).replace(/\r\n/g, "\n");
    expect(localContent).toBe("main content\n");
  });

  it("succeeds on a second call for the same repo/env, reusing the existing worktree instead of re-adding it", async () => {
    // Simulates the ordinary "re-run the pipeline" case: the first call
    // creates the worktree via `git worktree add`; without the path-separator
    // fix, `worktreeExists`'s raw substring match never matches on Windows
    // (porcelain output is forward-slash, `worktreePath` is backslash-separated
    // there), so this second call would take the `add` branch again and throw
    // "... already exists" instead of reusing it via checkout+pull.
    const first = await syncWorktree(localDir, "orders-service", "develop", "dev");
    expect(first).toBe(worktreePath("orders-service", "dev"));

    // Advance "develop" upstream between the two syncs, so the reuse path's
    // `pull` has something to actually pull — proving it's a real
    // checkout+pull, not a no-op that happens to leave stale content behind.
    const upstreamGit = simpleGit(upstreamDir);
    await upstreamGit.checkout("develop");
    await writeFile(path.join(upstreamDir, "app.txt"), "develop content v2\n");
    await upstreamGit.add("./*");
    await upstreamGit.commit("second commit on develop");
    await upstreamGit.checkout("main");

    const second = await syncWorktree(localDir, "orders-service", "develop", "dev");
    expect(second).toBe(first);

    // Only one worktree should ever be registered for this (repoKey, env) —
    // if the reuse path weren't taken, `git worktree add` would either throw
    // "already exists" (directory still present) or register a duplicate.
    const worktreeList = await simpleGit(localDir).raw(["worktree", "list", "--porcelain"]);
    const registeredCount = worktreeList
      .split("\n")
      .filter((line) => line.startsWith("worktree ") && line.replace(/\\/g, "/").includes(second.replace(/\\/g, "/"))).length;
    expect(registeredCount).toBe(1);

    const worktreeBranch = (await simpleGit(second).branch()).current;
    expect(worktreeBranch).toBe("develop");

    const worktreeContent = (await readFile(path.join(second, "app.txt"), "utf-8")).replace(/\r\n/g, "\n");
    expect(worktreeContent).toBe("develop content v2\n");
  });
});
