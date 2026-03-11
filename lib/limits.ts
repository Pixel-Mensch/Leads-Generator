import { db } from "@/lib/db";

/**
 * Plan limits - code-defined, no DB table needed for MVP.
 * Update these constants as plans evolve.
 */
export const PLAN_LIMITS = {
  FREE: {
    jobsPerMonth: 10,
    leadsPerJob: 50,
    projects: 2,
    lists: 5,
  },
  PRO: {
    jobsPerMonth: 200,
    leadsPerJob: 200,
    projects: 20,
    lists: 100,
  },
  ENTERPRISE: {
    jobsPerMonth: Infinity,
    leadsPerJob: 500,
    projects: Infinity,
    lists: Infinity,
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export function getEffectivePlan(
  plan: string,
  planExpiresAt?: Date | null
): PlanKey {
  const normalizedPlan =
    (plan as PlanKey) in PLAN_LIMITS ? (plan as PlanKey) : "FREE";

  if (normalizedPlan === "FREE") return normalizedPlan;
  if (!planExpiresAt) return normalizedPlan;

  return planExpiresAt.getTime() >= Date.now() ? normalizedPlan : "FREE";
}

export function getLimits(plan: string, planExpiresAt?: Date | null) {
  return PLAN_LIMITS[getEffectivePlan(plan, planExpiresAt)];
}

export function serializeLimit(limit: number) {
  return Number.isFinite(limit) ? limit : null;
}

export function getRemainingCapacity(used: number, limit: number) {
  return Number.isFinite(limit) ? Math.max(limit - used, 0) : null;
}

/**
 * Check if the user has reached their monthly job limit.
 * Counts completed/running/pending jobs in the current calendar month.
 */
export async function checkJobLimit(userId: string, plan: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  const limits = getLimits(plan);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const used = await db.searchJob.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
    },
  });

  return {
    allowed: used < limits.jobsPerMonth,
    used,
    limit: limits.jobsPerMonth,
  };
}

export async function checkProjectLimit(userId: string, plan: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  const limits = getLimits(plan);
  const used = await db.project.count({
    where: { userId, deletedAt: null },
  });

  return {
    allowed: used < limits.projects,
    used,
    limit: limits.projects,
  };
}

export async function checkLeadListLimit(
  userId: string,
  plan: string
): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  const limits = getLimits(plan);
  const used = await db.leadList.count({
    where: {
      project: {
        userId,
        deletedAt: null,
      },
    },
  });

  return {
    allowed: used < limits.lists,
    used,
    limit: limits.lists,
  };
}
