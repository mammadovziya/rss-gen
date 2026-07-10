import { NextRequest, NextResponse } from "next/server";
import { getCache, getHealthStore, getStore, handleError, rateLimit, absoluteRequestUrl } from "../../../lib/server-runtime.js";
import { sourceConfigSchema } from "../../../types.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    return NextResponse.json({ feeds: await getStore().list() });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const source = sourceConfigSchema.parse(await request.json());
    const feed = await getStore().save(source);
    getCache().delete(feed);
    await getHealthStore().delete(feed.id);
    return NextResponse.json(
      { feed, rssUrl: absoluteRequestUrl(request, `/rss/${feed.id}.xml`) },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
