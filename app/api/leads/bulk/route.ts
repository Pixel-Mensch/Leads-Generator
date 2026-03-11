import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { z } from "zod";
import { LeadStatus } from "@prisma/client";

const BulkUpdateSchema = z.object({
  ids:    z.array(z.string().cuid()).min(1).max(200),
  status: z.nativeEnum(LeadStatus),
});

/**
 * PATCH /api/leads/bulk
 * Update status for multiple leads at once.
 * Ownership enforced via job.userId — leads not owned by the user are silently skipped.
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = BulkUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { ids, status } = parsed.data;

    // updateMany with ownership check via nested join
    const result = await db.lead.updateMany({
      where: {
        id:  { in: ids },
        job: { userId: session.user.id },
      },
      data: { status },
    });

    return NextResponse.json({ updated: result.count });
  } catch (err) {
    console.error("[PATCH /api/leads/bulk]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
