import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(300).optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const project = await db.project.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
      include: {
        jobs: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { leads: true } } },
        },
        lists: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { leads: true } } },
        },
      },
    });
    if (!project) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    return NextResponse.json(project);
  } catch (err) {
    console.error("[GET /api/projects/[id]]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const project = await db.project.findFirst({ where: { id, userId: session.user.id, deletedAt: null } });
    if (!project) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const body = await req.json();
    const parsed = UpdateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await db.project.update({ where: { id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/projects/[id]]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const project = await db.project.findFirst({ where: { id, userId: session.user.id, deletedAt: null } });
    if (!project) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    // Soft delete — preserve lead data
    await db.project.update({ where: { id }, data: { deletedAt: new Date() } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/projects/[id]]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
