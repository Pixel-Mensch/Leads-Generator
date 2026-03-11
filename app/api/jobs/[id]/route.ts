import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const job = await db.searchJob.findFirst({
      where: { id, userId: session.user.id },
      include: { _count: { select: { leads: true } } },
    });
    if (!job) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    return NextResponse.json(job);
  } catch (err) {
    console.error("[GET /api/jobs/[id]]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const job = await db.searchJob.findFirst({ where: { id, userId: session.user.id } });
    if (!job) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    await db.searchJob.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/jobs/[id]]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
