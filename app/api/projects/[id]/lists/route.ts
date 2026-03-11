import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { checkLeadListLimit } from "@/lib/limits";
import { z } from "zod";

const CreateListSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { id: projectId } = await params;
    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
    }

    const lists = await db.leadList.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { leads: true } } },
    });
    return NextResponse.json(lists);
  } catch (err) {
    console.error("[GET /api/projects/[id]/lists]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { id: projectId } = await params;
    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
    }

    const limitCheck = await checkLeadListLimit(session.user.id, session.user.plan);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Listen-Limit erreicht (${limitCheck.used}/${limitCheck.limit}). Upgrade fuer mehr Lead-Listen.`,
          limitReached: true,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = CreateListSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const list = await db.leadList.create({
      data: { ...parsed.data, projectId },
    });
    return NextResponse.json(list, { status: 201 });
  } catch (err) {
    console.error("[POST /api/projects/[id]/lists]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
