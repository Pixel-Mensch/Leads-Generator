import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LeadStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") ?? undefined;
    const status = searchParams.get("status") as LeadStatus | null;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const where = {
      ...(jobId ? { jobId } : {}),
      ...(status ? { status } : {}),
    };

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      db.lead.count({ where }),
    ]);

    return NextResponse.json({ leads, total, page, limit });
  } catch (err) {
    console.error("[GET /api/leads]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
