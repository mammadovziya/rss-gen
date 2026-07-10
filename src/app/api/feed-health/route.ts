import { NextRequest, NextResponse } from "next/server";
import { getHealthStore, handleError, rateLimit } from "../../../lib/server-runtime.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    return NextResponse.json({ health: await getHealthStore().list() });
  } catch (error) {
    return handleError(error);
  }
}
