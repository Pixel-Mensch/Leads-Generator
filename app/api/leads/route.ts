import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { LeadStatus } from "@prisma/client";

type SortField = "confidence" | "createdAt" | "companyName" | "city" | "followUpAt";

const SORT_FIELDS: SortField[] = ["confidence", "createdAt", "companyName", "city", "followUpAt"];

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const jobId      = searchParams.get("jobId")      ?? undefined;
    const projectId  = searchParams.get("projectId")  ?? undefined;
    const listId     = searchParams.get("listId")     ?? undefined;
    const status     = searchParams.get("status")     as LeadStatus | null;
    const tag        = searchParams.get("tag")        ?? undefined;
    const category   = searchParams.get("category")   ?? undefined;
    const sourceName = searchParams.get("sourceName") ?? undefined;
    const sortRaw    = searchParams.get("sort")       ?? "confidence";
    const sort: SortField = SORT_FIELDS.includes(sortRaw as SortField)
      ? (sortRaw as SortField)
      : "confidence";
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip  = (page - 1) * limit;

    const where = {
      job: { userId: session.user.id },
      ...(jobId      ? { jobId }                                            : {}),
      ...(projectId  ? { job: { userId: session.user.id, projectId } }     : {}),
      ...(listId     ? { listId }                                           : {}),
      ...(status     ? { status }                                           : {}),
      ...(tag        ? { tags: { has: tag } }                               : {}),
      ...(category   ? { category: { contains: category, mode: "insensitive" as const } } : {}),
      ...(sourceName ? { sourceName }                                       : {}),
    };

    // Build orderBy — always secondary sort by createdAt desc for stability
    const orderBy =
      sort === "companyName" || sort === "city"
        ? [{ [sort]: "asc" as const },  { createdAt: "desc" as const }]
        : [{ [sort]: "desc" as const }, { createdAt: "desc" as const }];

    const [leads, total] = await Promise.all([
      db.lead.findMany({ where, orderBy, skip, take: limit }),
      db.lead.count({ where }),
    ]);

    return NextResponse.json({ leads, total, page, limit });
  } catch (err) {
    console.error("[GET /api/leads]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
