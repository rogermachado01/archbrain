import path from "node:path";
import { NextResponse } from "next/server";
import { loadRepoMap, saveRepoMap } from "@okf-scan/repo-map";
import { errorResponse } from "@/lib/pipeline/api-helpers";

const REPO_MAP_PATH = path.join(process.cwd(), "repo-map.yaml");

export async function GET() {
  try {
    const config = await loadRepoMap(REPO_MAP_PATH);
    return NextResponse.json({ config });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ config: null });
    }
    return errorResponse(err, 400);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await saveRepoMap(REPO_MAP_PATH, body?.config);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, 400);
  }
}
