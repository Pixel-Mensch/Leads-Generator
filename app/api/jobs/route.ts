import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { checkJobLimit } from "@/lib/limits";
import { z } from "zod";

const CreateJobSchema = z.object({
  query: z.string().min(1).max(100),
  location: z.string().min(1).max(100),
  radius: z.number().int().min(1).max(100).optional(),
  source: z.enum(["overpass", "gelbeseiten", "both"]).default("overpass"),
  projectId: z.string().cuid().optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = CreateJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const limitCheck = await checkJobLimit(session.user.id, session.user.plan);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Monatliches Job-Limit erreicht (${limitCheck.used}/${limitCheck.limit}). Upgrade auf Pro fuer mehr Jobs.`,
          limitReached: true,
        },
        { status: 429 }
      );
    }

    if (parsed.data.projectId) {
      const project = await db.project.findFirst({
        where: { id: parsed.data.projectId, userId: session.user.id, deletedAt: null },
      });
      if (!project) {
        return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
      }
    }

    const job = await db.searchJob.create({
      data: { ...parsed.data, userId: session.user.id },
    });
    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    console.error("[POST /api/jobs]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") ?? undefined;

    const jobs = await db.searchJob.findMany({
      where: {
        userId: session.user.id,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { leads: true } } },
    });
    return NextResponse.json(jobs);
  } catch (err) {
    console.error("[GET /api/jobs]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
