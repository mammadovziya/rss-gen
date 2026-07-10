import { NextRequest } from "next/server";
import { renderRssXml } from "../../feed";
import { queryFromSearchParams, sourceConfigFromQuery } from "../../http-input";
import { absoluteRequestUrl, extractWithCache, handleError, rateLimit, rssResponse } from "../../lib/server-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const source = sourceConfigFromQuery(queryFromSearchParams(request.nextUrl.searchParams));
    const result = await extractWithCache(source);
    const selfUrl = absoluteRequestUrl(request, `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return rssResponse(renderRssXml(source, result, selfUrl));
  } catch (error) {
    return handleError(error);
  }
}
