import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateJobSchema = z.object({
  query: z.string().min(1).max(100),
  location: z.string().min(1).max(100),
  radius: z.number().int().min(1).max(100).optional(),
  source: z.enum(["overpass", "gelbeseiten", "both"]).default("overpass"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const job = await db.searchJob.create({ data: parsed.data });
    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    console.error("[POST /api/jobs]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const jobs = await db.searchJob.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { leads: true } } },
    });
    return NextResponse.json(jobs);
  } catch (err) {
    console.error("[GET /api/jobs]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
