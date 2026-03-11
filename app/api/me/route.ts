import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import {
  checkJobLimit,
  checkLeadListLimit,
  checkProjectLimit,
  getEffectivePlan,
  getLimits,
  getRemainingCapacity,
  serializeLimit,
} from "@/lib/limits";

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
      },
    });
    if (!user) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const effectivePlan = getEffectivePlan(user.plan, user.planExpiresAt);
    const limits = getLimits(user.plan, user.planExpiresAt);
    const [jobUsage, projectUsage, listUsage] = await Promise.all([
      checkJobLimit(session.user.id, session.user.plan),
      checkProjectLimit(session.user.id, session.user.plan),
      checkLeadListLimit(session.user.id, session.user.plan),
    ]);

    return NextResponse.json({
      ...user,
      configuredPlan: user.plan,
      plan: effectivePlan,
      billing: {
        configuredPlan: user.plan,
        effectivePlan,
        planExpiresAt: user.planExpiresAt,
        hasExpiredPaidPlan:
          user.plan !== "FREE" && effectivePlan !== user.plan,
      },
      usage: {
        jobsThisMonth: jobUsage.used,
        jobLimit: serializeLimit(jobUsage.limit),
        jobsRemaining: getRemainingCapacity(jobUsage.used, jobUsage.limit),
        activeProjects: projectUsage.used,
        projectLimit: serializeLimit(projectUsage.limit),
        projectSlotsRemaining: getRemainingCapacity(
          projectUsage.used,
          projectUsage.limit
        ),
        leadLists: listUsage.used,
        listLimit: serializeLimit(listUsage.limit),
        listSlotsRemaining: getRemainingCapacity(
          listUsage.used,
          listUsage.limit
        ),
        leadsPerJob: limits.leadsPerJob,
      },
    });
  } catch (err) {
    console.error("[GET /api/me]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
