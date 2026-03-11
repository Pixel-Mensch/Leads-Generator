import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";

/**
 * GET /api/leads/stats
 * Returns lead counts grouped by status for the current user.
 * Optional: ?jobId=... or ?projectId=... to scope to a specific context.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const jobId     = searchParams.get("jobId")     ?? undefined;
    const projectId = searchParams.get("projectId") ?? undefined;

    const where = {
      job: { userId: session.user.id },
      ...(jobId     ? { jobId }                                        : {}),
      ...(projectId ? { job: { userId: session.user.id, projectId } } : {}),
    };

    const grouped = await db.lead.groupBy({
      by: ["status"],
      where,
      _count: { status: true },
    });

    const byStatus: Record<string, number> = {
      NEW: 0, CONTACTED: 0, INTERESTED: 0,
      NOT_INTERESTED: 0, CONVERTED: 0, INVALID: 0,
    };
    let total = 0;

    for (const row of grouped) {
      byStatus[row.status] = row._count.status;
      total += row._count.status;
    }

    return NextResponse.json({ byStatus, total });
  } catch (err) {
    console.error("[GET /api/leads/stats]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
