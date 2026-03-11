import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { leadsToCSV } from "@/lib/export/csv";
import { LeadStatus } from "@prisma/client";

function buildSourceNameFilter(sourceName: string) {
  return {
    OR: [
      { sourceName: { equals: sourceName, mode: "insensitive" as const } },
      { sourceName: { startsWith: `${sourceName},`, mode: "insensitive" as const } },
      { sourceName: { endsWith: `,${sourceName}`, mode: "insensitive" as const } },
      { sourceName: { contains: `,${sourceName},`, mode: "insensitive" as const } },
    ],
  };
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") ?? undefined;
    const projectId = searchParams.get("projectId") ?? undefined;
    const listId = searchParams.get("listId") ?? undefined;
    const status = searchParams.get("status") as LeadStatus | null;
    const tag = searchParams.get("tag") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const sourceName = searchParams.get("sourceName") ?? undefined;

    const leads = await db.lead.findMany({
      where: {
        job: { userId: session.user.id },
        ...(jobId ? { jobId } : {}),
        ...(projectId ? { job: { userId: session.user.id, projectId } } : {}),
        ...(listId ? { listId } : {}),
        ...(status ? { status } : {}),
        ...(tag ? { tags: { has: tag } } : {}),
        ...(category
          ? { category: { contains: category, mode: "insensitive" as const } }
          : {}),
        ...(sourceName ? buildSourceNameFilter(sourceName) : {}),
      },
      orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
    });

    const exportedAt = new Date();
    const csv = leadsToCSV(leads, {
      exportedAt,
      jobId: jobId ?? undefined,
      projectId: projectId ?? undefined,
      listId: listId ?? undefined,
      statusFilter: status ?? undefined,
      tagFilter: tag ?? undefined,
      categoryFilter: category ?? undefined,
      sourceFilter: sourceName ?? undefined,
      totalLeads: leads.length,
    });
    const filename = `leads_${exportedAt.toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/export/csv]", err);
    return NextResponse.json({ error: "Export fehlgeschlagen" }, { status: 500 });
  }
}
