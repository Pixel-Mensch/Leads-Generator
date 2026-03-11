import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadsToXLSX } from "@/lib/export/xlsx";
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

    const buffer = await leadsToXLSX(leads);
    const filename = `leads_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/export/xlsx]", err);
    return NextResponse.json({ error: "Export fehlgeschlagen" }, { status: 500 });
  }
}
