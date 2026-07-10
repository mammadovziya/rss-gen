import { NextRequest } from "next/server";
import { renderRssXml } from "../../../feed.js";
import { absoluteRequestUrl, extractWithCache, getStore, handleError, rateLimit, rssResponse } from "../../../lib/server-runtime.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string[] }> | { slug: string[] };
};

export async function GET(request: NextRequest, context: RouteContext) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const { slug } = await context.params;
    const lastSegment = slug.at(-1) || "";
    const id = lastSegment.endsWith(".xml") ? lastSegment.slice(0, -4) : lastSegment;
    const source = await getStore().get(id);
    if (!source) return new Response("Feed recipe not found.", { status: 404, headers: { "Content-Type": "text/plain" } });
    const result = await extractWithCache(source);
    const selfUrl = absoluteRequestUrl(request, `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return rssResponse(renderRssXml(source, result, selfUrl));
  } catch (error) {
    return handleError(error);
  }
}
