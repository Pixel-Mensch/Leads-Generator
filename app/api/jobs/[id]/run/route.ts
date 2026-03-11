import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { runJob } from "@/lib/scraper/orchestrator";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const job = await db.searchJob.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!job) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  if (job.status !== "PENDING") {
    return NextResponse.json(
      { error: "Job kann nur im Status PENDING gestartet werden" },
      { status: 409 }
    );
  }

  runJob(id).catch((err) => {
    console.error(`[Job ${id}] Fehler:`, err);
  });

  return NextResponse.json({ message: "Job gestartet", jobId: id }, { status: 202 });
}
