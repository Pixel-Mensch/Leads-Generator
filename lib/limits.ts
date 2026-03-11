/**
 * Plan limits — code-defined, no DB table needed for MVP.
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

export function getLimits(plan: string) {
  return PLAN_LIMITS[(plan as PlanKey) in PLAN_LIMITS ? (plan as PlanKey) : "FREE"];
}

/**
 * Check if the user has reached their monthly job limit.
 * Counts completed/running/pending jobs in the current calendar month.
 */
import { db } from "@/lib/db";

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
