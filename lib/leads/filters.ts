import type { Prisma } from "@prisma/client";

export type FollowUpFilter = "due" | "scheduled" | "none";

export function buildSourceNameFilter(sourceName: string): Prisma.LeadWhereInput {
  return {
    OR: [
      { sourceName: { equals: sourceName, mode: "insensitive" } },
      { sourceName: { startsWith: `${sourceName},`, mode: "insensitive" } },
      { sourceName: { endsWith: `,${sourceName}`, mode: "insensitive" } },
      { sourceName: { contains: `,${sourceName},`, mode: "insensitive" } },
    ],
  };
}

export function buildLeadSearchFilter(query: string): Prisma.LeadWhereInput {
  const trimmed = query.trim();

  if (!trimmed) {
    return {};
  }

  return {
    OR: [
      { companyName: { contains: trimmed, mode: "insensitive" } },
      { city: { contains: trimmed, mode: "insensitive" } },
      { category: { contains: trimmed, mode: "insensitive" } },
      { notes: { contains: trimmed, mode: "insensitive" } },
      { email: { contains: trimmed, mode: "insensitive" } },
      { phone: { contains: trimmed, mode: "insensitive" } },
      buildSourceNameFilter(trimmed),
    ],
  };
}

export function buildFollowUpFilter(
  followUp: string | undefined,
  now: Date = new Date()
): Prisma.LeadWhereInput {
  switch (followUp) {
    case "due":
      return {
        followUpAt: { not: null, lte: now },
        status: { notIn: ["CONVERTED", "INVALID"] },
      };
    case "scheduled":
      return {
        followUpAt: { not: null },
        status: { notIn: ["CONVERTED", "INVALID"] },
      };
    case "none":
      return {
        followUpAt: null,
      };
    default:
      return {};
  }
}
