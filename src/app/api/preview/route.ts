import { NextRequest, NextResponse } from "next/server";
import { adHocFeedUrl, extractWithCache, handleError, rateLimit } from "../../../lib/server-runtime.js";
import { sourceConfigSchema } from "../../../types.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const source = sourceConfigSchema.parse(await request.json());
    const result = await extractWithCache(source);
    return NextResponse.json({ result, rssUrl: adHocFeedUrl(request, source) });
  } catch (error) {
    return handleError(error);
  }
}
