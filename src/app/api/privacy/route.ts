import { NextResponse } from "next/server";
import { privacySummary } from "../../../security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ privacy: privacySummary() });
}
