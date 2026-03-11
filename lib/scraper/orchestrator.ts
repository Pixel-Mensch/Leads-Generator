/**
 * Job Orchestrator
 * Runs a SearchJob: selects source, scrapes, deduplicates, persists leads.
 */

import { db } from "@/lib/db";
import { JobStatus } from "@prisma/client";
import { scrapeOverpass } from "./sources/overpass";
import { scrapeGelbeSeiten } from "./sources/gelbeseiten";
import { deduplicateLeads } from "./deduplicator";
import type { RawLead } from "./sources/overpass";

export type ScraperSource = "overpass" | "gelbeseiten" | "both";

export async function runJob(jobId: string): Promise<void> {
  const job = await db.searchJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job nicht gefunden: ${jobId}`);
  if (job.status === "RUNNING") throw new Error("Job läuft bereits");

  await db.searchJob.update({
    where: { id: jobId },
    data: { status: "RUNNING", error: null },
  });

  try {
    const maxResults = parseInt(process.env.SCRAPE_MAX_RESULTS ?? "50", 10);
    const radiusKm = job.radius ?? 5;
    const source = job.source as ScraperSource;

    let rawLeads: RawLead[] = [];

    if (source === "overpass" || source === "both") {
      const results = await scrapeOverpass(job.query, job.location, radiusKm, maxResults);
      rawLeads.push(...results);
    }

    if (source === "gelbeseiten" || source === "both") {
      const results = await scrapeGelbeSeiten(job.query, job.location, maxResults);
      rawLeads.push(...results);
    }

    // Deduplicate across sources
    rawLeads = deduplicateLeads(rawLeads);

    // Fetch existing leads for this job to avoid DB unique conflicts
    const existing = await db.lead.findMany({
      where: { jobId },
      select: { companyName: true, phone: true },
    });
    const existingKeys = new Set(
      existing.map((l) => `${l.companyName}||${l.phone ?? ""}`)
    );

    const toInsert = rawLeads.filter(
      (l) => !existingKeys.has(`${l.companyName}||${l.phone ?? ""}`)
    );

    if (toInsert.length > 0) {
      await db.lead.createMany({
        data: toInsert.map((l) => ({ ...l, jobId })),
        skipDuplicates: true,
      });
    }

    await db.searchJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        totalFound: rawLeads.length,
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
