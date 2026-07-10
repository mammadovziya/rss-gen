import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCache, getHealthStore, getStore, handleError, rateLimit } from "../../../lib/server-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const payload = z
      .object({
        feeds: z.array(z.unknown()),
        mode: z.enum(["merge", "replace"]).optional().default("merge")
      })
      .parse(await request.json());
    const feeds = await getStore().import(payload.feeds, payload.mode);
    getCache().clear();
    await getHealthStore().prune(feeds.map((feed) => feed.id));
    return NextResponse.json({ feeds, imported: payload.feeds.length, mode: payload.mode });
  } catch (error) {
    return handleError(error);
  }
}
