import { NextRequest } from "next/server";
import { getStore, handleError, rateLimit } from "../../../lib/server-runtime.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const backup = await getStore().export();
    return Response.json(
      { ...backup, exportedAt: new Date().toISOString() },
      {
        headers: {
          "Content-Disposition": `attachment; filename="rss-generator-backup-${new Date().toISOString().slice(0, 10)}.json"`
        }
      }
    );
  } catch (error) {
    return handleError(error);
  }
}
