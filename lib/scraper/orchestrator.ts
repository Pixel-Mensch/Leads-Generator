/**
 * Job orchestrator
 * Runs a SearchJob: selects source(s), scrapes, deduplicates, persists leads.
 *
 * In "both" mode: partial success is allowed.
 * If one source fails, the other source's results are still saved.
 */

import { db } from "@/lib/db";
import { scrapeOverpass } from "./sources/overpass";
import { scrapeGelbeSeiten } from "./sources/gelbeseiten";
import { deduplicateLeads } from "./deduplicator";
import {
  computeConfidence,
  extractDomain,
  normalizeComparableText,
  normalizeCompanyName,
} from "@/lib/parser/normalize";
import { getLimits } from "@/lib/limits";
import type { RawLead } from "./sources/overpass";

export type ScraperSource = "overpass" | "gelbeseiten" | "both";

export async function runJob(jobId: string): Promise<void> {
  const job = await db.searchJob.findUnique({
    where: { id: jobId },
    include: {
      user: {
        select: {
          isActive: true,
          plan: true,
          planExpiresAt: true,
        },
      },
    },
  });
  if (!job) throw new Error(`Job nicht gefunden: ${jobId}`);
  if (job.status === "RUNNING") throw new Error("Job laeuft bereits");
  if (job.userId && (!job.user || !job.user.isActive)) {
    throw new Error("Job-Eigentuemer ist nicht aktiv");
  }

  await db.searchJob.update({
    where: { id: jobId },
    data: { status: "RUNNING", error: null },
  });

  try {
    const configuredMaxResults = process.env.SCRAPE_MAX_RESULTS
      ? parseInt(process.env.SCRAPE_MAX_RESULTS, 10)
      : null;
    const planLimits = getLimits(
      job.user?.plan ?? "FREE",
      job.user?.planExpiresAt ?? null
    );
    const maxResults = configuredMaxResults
      ? Math.min(configuredMaxResults, planLimits.leadsPerJob)
      : planLimits.leadsPerJob;
    const radiusKm = job.radius ?? 5;
    const source = job.source as ScraperSource;

    let rawLeads: RawLead[] = [];
    const sourceErrors: string[] = [];

    if (source === "overpass" || source === "both") {
      try {
        const results = await scrapeOverpass(
          job.query,
          job.location,
          radiusKm,
          maxResults
        );
        rawLeads.push(...results);
        console.log(`[Job ${jobId}] Overpass: ${results.length} Rohtreffer`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Job ${jobId}] Overpass Fehler: ${msg}`);
        if (source === "overpass") throw err;
        sourceErrors.push(`Overpass: ${msg}`);
      }
    }

    if (source === "gelbeseiten" || source === "both") {
      try {
        const results = await scrapeGelbeSeiten(
          job.query,
          job.location,
          maxResults
        );
        rawLeads.push(...results);
        console.log(`[Job ${jobId}] Gelbe Seiten: ${results.length} Rohtreffer`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Job ${jobId}] Gelbe Seiten Fehler: ${msg}`);
        if (source === "gelbeseiten") throw err;
        sourceErrors.push(`GelbeSeiten: ${msg}`);
      }
    }

    if (source === "both" && rawLeads.length === 0 && sourceErrors.length > 0) {
      throw new Error(sourceErrors.join("; "));
    }

    rawLeads = deduplicateLeads(rawLeads);
    console.log(
      `[Job ${jobId}] Nach Deduplizierung: ${rawLeads.length} eindeutige Leads`
    );

    for (const lead of rawLeads) {
      lead.confidence = computeConfidence(lead).score;
    }

    const existing = await db.lead.findMany({
      where: { jobId },
      select: { companyName: true, city: true, phone: true, website: true },
    });
    const existingDomains = new Set(
      existing
        .map((lead) => extractDomain(lead.website))
        .filter(Boolean)
    );
    const existingPhones = new Set(
      existing.map((lead) => lead.phone?.replace(/\D/g, "")).filter(Boolean)
    );
    const existingNames = new Set(
      existing
        .map((lead) => {
          const normalizedName = normalizeCompanyName(lead.companyName);
          const normalizedCity = normalizeComparableText(lead.city);
          return normalizedName && normalizedCity
            ? `${normalizedName}::${normalizedCity}`
            : null;
        })
        .filter(Boolean)
    );

    const toInsert = rawLeads.filter((lead) => {
      const domain = extractDomain(lead.website);
      const phone = lead.phone?.replace(/\D/g, "");
      const normalizedName = normalizeCompanyName(lead.companyName);
      const normalizedCity = normalizeComparableText(lead.city);
      const nameKey =
        normalizedName && normalizedCity
          ? `${normalizedName}::${normalizedCity}`
          : null;

      if (domain && existingDomains.has(domain)) return false;
      if (phone && phone.length >= 7 && existingPhones.has(phone)) return false;
      if (nameKey && existingNames.has(nameKey)) return false;
      return true;
    });

    if (toInsert.length > 0) {
      await db.lead.createMany({
        data: toInsert.map((lead) => ({ ...lead, jobId })),
        skipDuplicates: true,
      });
    }

    const insertedCount = toInsert.length;
    console.log(`[Job ${jobId}] Gespeichert: ${insertedCount} neue Leads`);

    const errorNote =
      sourceErrors.length > 0
        ? `Teilweise Fehler: ${sourceErrors.join("; ")}`
        : null;

    await db.searchJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        totalFound: insertedCount,
        error: errorNote,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    await db.searchJob.update({
      where: { id: jobId },
      data: { status: "FAILED", error: message },
    });
    throw err;
  }
}
