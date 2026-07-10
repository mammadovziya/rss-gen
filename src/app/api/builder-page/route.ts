import { NextRequest, NextResponse } from "next/server";
import { createBuilderSnapshot } from "../../../extraction/builder-snapshot";
import { handleError, rateLimit } from "../../../lib/server-runtime";
import { sourceConfigSchema } from "../../../types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const source = sourceConfigSchema.parse(await request.json());
    const snapshot = await createBuilderSnapshot(source);
    return NextResponse.json({ snapshot });
  } catch (error) {
    return handleError(error);
  }
}
