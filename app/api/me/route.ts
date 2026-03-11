import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { getLimits, checkJobLimit, checkProjectLimit } from "@/lib/limits";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        role: true,
        planExpiresAt: true,
        createdAt: true,
        _count: { select: { projects: true, jobs: true } },
      },
    });
    if (!user) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const limits = getLimits(session.user.plan);
    const [jobUsage, projectUsage] = await Promise.all([
      checkJobLimit(session.user.id, session.user.plan),
      checkProjectLimit(session.user.id, session.user.plan),
    ]);

    return NextResponse.json({
      ...user,
      usage: {
        jobsThisMonth: jobUsage.used,
        jobLimit: jobUsage.limit,
        projects: projectUsage.used,
        projectLimit: projectUsage.limit,
        leadsPerJob: limits.leadsPerJob,
      },
    });
  } catch (err) {
    console.error("[GET /api/me]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
