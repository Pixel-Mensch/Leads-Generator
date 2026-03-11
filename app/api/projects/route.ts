import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { checkProjectLimit } from "@/lib/limits";
import { z } from "zod";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
});

export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const projects = await db.project.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { jobs: true, lists: true } },
      },
    });
    return NextResponse.json(projects);
  } catch (err) {
    console.error("[GET /api/projects]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = CreateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const limitCheck = await checkProjectLimit(session.user.id, session.user.plan);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Projekt-Limit erreicht (${limitCheck.used}/${limitCheck.limit}). Upgrade auf Pro fuer mehr Projekte.`,
          limitReached: true,
        },
        { status: 429 }
      );
    }

    const project = await db.project.create({
      data: { ...parsed.data, userId: session.user.id },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("[POST /api/projects]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
