import { NextRequest, NextResponse } from "next/server";
import { runJob } from "@/lib/scraper/orchestrator";

/**
 * POST /api/jobs/:id/run
 * Triggers the job in the background (fire-and-forget for MVP).
 * Returns immediately with 202 Accepted.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fire and forget — no await. The job updates its own status in DB.
  runJob(id).catch((err) => {
    console.error(`[Job ${id}] Fehler:`, err);
  });

  return NextResponse.json({ message: "Job gestartet", jobId: id }, { status: 202 });
}
