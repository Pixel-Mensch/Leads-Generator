import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import {
  buildFollowUpFilter,
  buildLeadSearchFilter,
  buildSourceNameFilter,
} from "@/lib/leads/filters";

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
    const listId    = searchParams.get("listId")    ?? undefined;
    const tag       = searchParams.get("tag")       ?? undefined;
    const category  = searchParams.get("category")  ?? undefined;
    const sourceName = searchParams.get("sourceName") ?? undefined;
    const q         = searchParams.get("q")         ?? undefined;
    const followUp  = searchParams.get("followUp")  ?? undefined;

    const where = {
      job: { userId: session.user.id },
      ...(jobId     ? { jobId }                                        : {}),
      ...(projectId ? { job: { userId: session.user.id, projectId } } : {}),
      ...(listId    ? { listId }                                      : {}),
      ...(tag       ? { tags: { has: tag } }                          : {}),
      ...(category
        ? { category: { contains: category, mode: "insensitive" as const } }
        : {}),
      ...(sourceName ? buildSourceNameFilter(sourceName)              : {}),
      ...(q         ? buildLeadSearchFilter(q)                        : {}),
      ...(followUp  ? buildFollowUpFilter(followUp)                   : {}),
    };

    const [grouped, followUpDue, followUpScheduled] = await Promise.all([
      db.lead.groupBy({
        by: ["status"],
        where,
        _count: { status: true },
      }),
      db.lead.count({
        where: {
          ...where,
          ...buildFollowUpFilter("due"),
        },
      }),
      db.lead.count({
        where: {
          ...where,
          ...buildFollowUpFilter("scheduled"),
        },
      }),
    ]);

    const byStatus: Record<string, number> = {
      NEW: 0, CONTACTED: 0, INTERESTED: 0,
      NOT_INTERESTED: 0, CONVERTED: 0, INVALID: 0,
    };
    let total = 0;

    for (const row of grouped) {
      byStatus[row.status] = row._count.status;
      total += row._count.status;
    }

    return NextResponse.json({ byStatus, total, followUpDue, followUpScheduled });
  } catch (err) {
    console.error("[GET /api/leads/stats]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
