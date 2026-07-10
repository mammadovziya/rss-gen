import { NextRequest, NextResponse } from "next/server";
import { getCache, getStore, handleError, rateLimit, runFeedHealthCheck } from "../../../../../lib/server-runtime.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function POST(request: NextRequest, context: RouteContext) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const feed = await getStore().get(id);
    if (!feed) return NextResponse.json({ error: "Feed recipe not found." }, { status: 404 });
    getCache().delete(feed);
    return NextResponse.json({ health: await runFeedHealthCheck(feed) });
  } catch (error) {
    return handleError(error);
  }
}
