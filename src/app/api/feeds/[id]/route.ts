import { NextRequest, NextResponse } from "next/server";
import { absoluteRequestUrl, getCache, getHealthStore, getStore, handleError, rateLimit } from "../../../../lib/server-runtime";
import { sourceConfigSchema } from "../../../../types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(request: NextRequest, context: RouteContext) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const feed = await getStore().get(id);
    if (!feed) return NextResponse.json({ error: "Feed recipe not found." }, { status: 404 });
    return NextResponse.json({ feed });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const source = sourceConfigSchema.parse(await request.json());
    const existing = await getStore().get(id);
    if (!existing) return NextResponse.json({ error: "Feed recipe not found." }, { status: 404 });
    const feed = await getStore().save(source, id);
    getCache().delete(feed);
    await getHealthStore().delete(feed.id);
    return NextResponse.json({ feed, rssUrl: absoluteRequestUrl(request, `/rss/${feed.id}.xml`) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const deleted = await getStore().delete(id);
    if (!deleted) return NextResponse.json({ error: "Feed recipe not found." }, { status: 404 });
    await getHealthStore().delete(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
