import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadsToCSV } from "@/lib/export/csv";
import { LeadStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") ?? undefined;
    const status = searchParams.get("status") as LeadStatus | null;

    const leads = await db.lead.findMany({
      where: {
        ...(jobId ? { jobId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
    });

    const csv = leadsToCSV(leads);
    const filename = `leads_${new Date().toISOString().split("T")[0]}.csv`;

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
