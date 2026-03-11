import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { leadsToCSV } from "@/lib/export/csv";
import { LeadStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") ?? undefined;
    const projectId = searchParams.get("projectId") ?? undefined;
    const status = searchParams.get("status") as LeadStatus | null;

    const leads = await db.lead.findMany({
      where: {
        job: { userId: session.user.id },
        ...(jobId ? { jobId } : {}),
        ...(projectId ? { job: { userId: session.user.id, projectId } } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
    });

    const exportedAt = new Date();
    const csv = leadsToCSV(leads, {
      exportedAt,
      jobId: jobId ?? undefined,
      projectId: projectId ?? undefined,
      statusFilter: status ?? undefined,
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
